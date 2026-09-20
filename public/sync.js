/* Offline-first storage with Supabase sync.
   Every write lands in localStorage immediately, then pushes to Supabase when signed in.
   Merging is per-key last-write-wins for checklists and union-by-id for logs, so
   two devices used offline never lose entries. */
(function () {
  "use strict";

  var SYNC_KEYS = ["ticks", "skin", "stretch", "weekly", "flip", "lifts", "t1500", "pushups"];
  var LOG_KEYS = ["t1500", "pushups"];     // [{id,v,d}]
  var META_KEY = "_meta";                  // {key: epoch ms}
  var LOCAL_ONLY = "_localOnly";
  var TABLE = "app_state";

  var mem = {}, meta = {}, sb = null, user = null, timer = null, pulling = false;
  var listeners = [];

  function raw(k, f) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; }
  }
  function rawSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  meta = raw(META_KEY, {});

  // Reads without caching, so a missing key never gets pinned as undefined.
  function peek(k) {
    return k in mem ? mem[k] : raw(k, undefined);
  }

  var Store = {
    get: function (k, f) {
      var v = peek(k);
      if (v === undefined) return f;
      mem[k] = v;
      return v;
    },
    set: function (k, v) {
      mem[k] = v;
      rawSet(k, v);
      if (SYNC_KEYS.indexOf(k) > -1) {
        meta[k] = Date.now();
        rawSet(META_KEY, meta);
        queuePush();
      }
    },
    hydrate: function (data, m) {
      SYNC_KEYS.forEach(function (k) {
        if (k in data) { mem[k] = data[k]; rawSet(k, data[k]); }
      });
      meta = m || meta;
      rawSet(META_KEY, meta);
    },
    snapshot: function () {
      var o = {};
      SYNC_KEYS.forEach(function (k) { var v = peek(k); if (v !== undefined) o[k] = v; });
      return o;
    },
    meta: function () { return meta; },
    keys: SYNC_KEYS,
    onChange: function (fn) { listeners.push(fn); },
    user: function () { return user; },
    ready: false
  };
  window.Store = Store;

  function emit(status) { listeners.forEach(function (fn) { try { fn(status); } catch (e) {} }); }

  /* ---------- merging ---------- */

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

  function stampLog(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(function (e) { return e && e.id ? e : Object.assign({ id: uid() }, e); });
  }

  function unionById(a, b) {
    var seen = {}, out = [];
    stampLog(a).concat(stampLog(b)).forEach(function (e) {
      if (!seen[e.id]) { seen[e.id] = 1; out.push(e); }
    });
    return out;
  }

  function mergeLifts(a, b) {
    var out = {}, k;
    a = a || {}; b = b || {};
    for (k in a) out[k] = stampLog(a[k]);
    for (k in b) out[k] = out[k] ? unionById(out[k], b[k]) : stampLog(b[k]);
    return out;
  }

  function merge(localData, localMeta, remoteData, remoteMeta) {
    var data = {}, m = {};
    SYNC_KEYS.forEach(function (k) {
      var lt = localMeta[k] || 0, rt = (remoteMeta || {})[k] || 0;
      var lv = localData[k], rv = (remoteData || {})[k];
      if (LOG_KEYS.indexOf(k) > -1) {
        if (lv !== undefined || rv !== undefined) data[k] = unionById(lv || [], rv || []);
      } else if (k === "lifts") {
        if (lv !== undefined || rv !== undefined) data[k] = mergeLifts(lv, rv);
      } else {
        var pick = rt > lt ? rv : lv;
        if (pick === undefined) pick = rv !== undefined ? rv : lv;
        if (pick !== undefined) data[k] = pick;
      }
      m[k] = Math.max(lt, rt);
    });
    return { data: data, meta: m };
  }

  /* ---------- supabase ---------- */

  function cfg() {
    var c = window.APP_CONFIG || {};
    return c.SUPABASE_URL && c.SUPABASE_ANON_KEY ? c : null;
  }

  function client() {
    if (sb) return sb;
    var c = cfg();
    if (!c || !window.supabase) return null;
    sb = window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage }
    });
    return sb;
  }

  function queuePush() {
    if (!user) return;
    clearTimeout(timer);
    timer = setTimeout(push, 1000);
  }

  function push() {
    if (!user || !sb) return;
    emit("saving");
    sb.from(TABLE).upsert({
      user_id: user.id,
      data: Store.snapshot(),
      meta: meta,
      updated_at: new Date().toISOString()
    }).then(function (r) {
      emit(r.error ? "error:" + r.error.message : "saved");
    });
  }

  function pull(silent) {
    if (!user || !sb || pulling) return Promise.resolve();
    pulling = true;
    if (!silent) emit("syncing");
    return sb.from(TABLE).select("data,meta").eq("user_id", user.id).maybeSingle().then(function (r) {
      pulling = false;
      if (r.error) { emit("error:" + r.error.message); return; }
      var row = r.data || {};
      var merged = merge(Store.snapshot(), meta, row.data || {}, row.meta || {});
      Store.hydrate(merged.data, merged.meta);
      emit("synced");
      if (window.rerender) window.rerender();
      push();
    }, function (e) { pulling = false; emit("error:" + e.message); });
  }

  /* ---------- auth ---------- */

  Store.auth = {
    available: function () { return !!cfg(); },
    signIn: function (email, pass) {
      var c = client();
      if (!c) return Promise.reject(new Error("Supabase isn't set up yet."));
      return c.auth.signInWithPassword({ email: email, password: pass });
    },
    signUp: function (email, pass) {
      var c = client();
      if (!c) return Promise.reject(new Error("Supabase isn't set up yet."));
      return c.auth.signUp({ email: email, password: pass });
    },
    signOut: function () { return sb ? sb.auth.signOut() : Promise.resolve(); },
    syncNow: function () { return pull(false); }
  };

  function setUser(u) {
    var was = user && user.id;
    user = u || null;
    if (user && user.id !== was) {
      pull(false);
      sb.channel("state-" + user.id)
        .on("postgres_changes",
            { event: "*", schema: "public", table: TABLE, filter: "user_id=eq." + user.id },
            function () { pull(true); })
        .subscribe();
    }
    emit(user ? "signed-in" : "signed-out");
  }

  Store.start = function () {
    var c = client();
    Store.ready = true;
    if (!c) { emit(cfg() ? "no-lib" : "unconfigured"); return; }
    c.auth.getSession().then(function (r) {
      setUser(r.data && r.data.session ? r.data.session.user : null);
    });
    c.auth.onAuthStateChange(function (_e, session) { setUser(session ? session.user : null); });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden && user) pull(true);
    });
    window.addEventListener("online", function () { if (user) pull(true); });
  };

  Store.localOnly = {
    get: function () { return raw(LOCAL_ONLY, false); },
    set: function (v) { rawSet(LOCAL_ONLY, v); }
  };
})();
