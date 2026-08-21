/**
 * DevFridge SDK v1.0
 * Subscription-gating via on-chain Fridge timelocks on Solana.
 * https://sdk.devfridge.cool
 *
 * Usage:
 *   <script src="https://sdk.devfridge.cool/sdk/devfridge-sdk.js"></script>
 *   const fridge = new DevFridgeSDK({ tokenMint: '<MINT>', plans: { ... } });
 *   const status = await fridge.checkSubscription(walletAddress);
 */
(function (global) {
  "use strict";

  var SCANNER = "https://scan.devfridge.cool";
  var FRIDGE = "https://devfridge.cool";

  /**
   * @param {Object} config
   * @param {string} config.tokenMint        - SPL mint address of the token
   * @param {Object} config.plans            - Subscription plans keyed by name
   * @param {number} config.plans[].minLockDays          - Minimum lock duration to qualify
   * @param {number} config.plans[].renewalThresholdDays - Days remaining that trigger renewal
   * @param {number} [config.plans[].minLockAmount]      - Minimum token amount to qualify (raw units)
   * @param {string} [config.scannerUrl]     - Override scanner base URL
   * @param {string} [config.fridgeUrl]      - Override fridge dApp URL
   * @param {number} [config.cacheTTL]       - Cache TTL in ms (default 60000)
   */
  function DevFridgeSDK(config) {
    if (!config || !config.tokenMint) {
      throw new Error("DevFridgeSDK: tokenMint is required");
    }
    if (!config.plans || Object.keys(config.plans).length === 0) {
      throw new Error("DevFridgeSDK: at least one plan is required");
    }

    // Validate plans
    var names = Object.keys(config.plans);
    for (var i = 0; i < names.length; i++) {
      var p = config.plans[names[i]];
      if (!p.minLockDays || p.minLockDays < 1) {
        throw new Error("DevFridgeSDK: plan '" + names[i] + "' needs minLockDays >= 1");
      }
      if (p.renewalThresholdDays == null || p.renewalThresholdDays < 0) {
        throw new Error("DevFridgeSDK: plan '" + names[i] + "' needs renewalThresholdDays >= 0");
      }
      if (p.renewalThresholdDays >= p.minLockDays) {
        throw new Error(
          "DevFridgeSDK: plan '" + names[i] + "' renewalThresholdDays must be < minLockDays"
        );
      }
      if (p.minLockAmount != null && (typeof p.minLockAmount !== "number" || p.minLockAmount < 0)) {
        throw new Error(
          "DevFridgeSDK: plan '" + names[i] + "' minLockAmount must be a number >= 0"
        );
      }
    }

    this.tokenMint = config.tokenMint;
    this.plans = config.plans;
    this.scannerUrl = config.scannerUrl || SCANNER;
    this.fridgeUrl = config.fridgeUrl || FRIDGE;
    this._cacheTTL = config.cacheTTL || 60000;
    this._cache = {};
  }

  /**
   * Check subscription status for a wallet.
   * @param {string} walletAddress - Solana wallet public key
   * @returns {Promise<Object>} Subscription status
   */
  DevFridgeSDK.prototype.checkSubscription = function (walletAddress) {
    if (!walletAddress) return Promise.reject(new Error("walletAddress required"));
    var self = this;
    return this._fetchLocks(walletAddress).then(function (data) {
      return self._evaluate(data, walletAddress);
    });
  };

  /** @private */
  DevFridgeSDK.prototype._fetchLocks = function (wallet) {
    var key = wallet + ":" + this.tokenMint;
    var cached = this._cache[key];
    if (cached && Date.now() - cached.ts < this._cacheTTL) {
      return Promise.resolve(cached.data);
    }
    var url =
      this.scannerUrl +
      "/api/sdk/check?wallet=" +
      encodeURIComponent(wallet) +
      "&mint=" +
      encodeURIComponent(this.tokenMint);
    var self = this;
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("DevFridge API error: " + res.status);
        return res.json();
      })
      .then(function (data) {
        self._cache[key] = { data: data, ts: Date.now() };
        return data;
      });
  };

  /** @private */
  DevFridgeSDK.prototype._evaluate = function (data, wallet) {
    var activeLocks = data.activeLocks || [];
    var best = data.bestLock || null;
    var daysRemaining = data.daysRemaining || 0;

    if (!best || activeLocks.length === 0) {
      return {
        active: false,
        plan: null,
        daysRemaining: 0,
        needsRenewal: false,
        renewalUrl: this.getLockUrl(),
        wallet: wallet,
        locks: data.locks || [],
        activeLocks: [],
        bestLock: null,
      };
    }

    // Pre-compute each lock's original duration in days
    for (var j = 0; j < activeLocks.length; j++) {
      activeLocks[j]._durationDays = Math.floor(
        (activeLocks[j].unlockAt - activeLocks[j].createdAt) / 86400
      );
    }

    // Match the best-fitting plan (sorted by minLockDays descending to match longest first)
    var planNames = Object.keys(this.plans);
    var sorted = planNames.slice().sort(
      function (a, b) {
        return this.plans[b].minLockDays - this.plans[a].minLockDays;
      }.bind(this)
    );

    var matchedPlan = null;
    var needsRenewal = false;
    var lockAmount = 0;

    for (var i = 0; i < sorted.length; i++) {
      var name = sorted[i];
      var plan = this.plans[name];

      // Sum only locks whose individual duration meets this plan's minLockDays
      var qualifyingAmount = 0;
      var hasQualifyingLock = false;
      for (var k = 0; k < activeLocks.length; k++) {
        if (activeLocks[k]._durationDays >= plan.minLockDays) {
          qualifyingAmount += Number(activeLocks[k].amount) || 0;
          hasQualifyingLock = true;
        }
      }

      if (!hasQualifyingLock) continue;
      if (plan.minLockAmount != null && qualifyingAmount < plan.minLockAmount) continue;

      matchedPlan = name;
      lockAmount = qualifyingAmount;
      needsRenewal = daysRemaining <= plan.renewalThresholdDays;
      break;
    }

    // No fallback: if no plan matched (duration too short or amount too low),
    // the subscription is not active regardless of remaining lock time.

    // active requires both time remaining AND a qualifying plan
    var isActive = daysRemaining > 0 && matchedPlan !== null;

    return {
      active: isActive,
      plan: matchedPlan,
      daysRemaining: daysRemaining,
      needsRenewal: isActive && needsRenewal,
      renewalUrl: isActive && needsRenewal ? this.getLockUrl() : (!isActive ? this.getLockUrl() : null),
      totalLockAmount: lockAmount,
      wallet: wallet,
      locks: data.locks || [],
      activeLocks: activeLocks,
      bestLock: best,
    };
  };

  /**
   * Generate a URL to the Fridge dApp for locking tokens.
   * @param {number} [days] - Suggested lock duration
   * @returns {string}
   */
  DevFridgeSDK.prototype.getLockUrl = function (days) {
    var url = this.fridgeUrl + "?mint=" + encodeURIComponent(this.tokenMint);
    if (days) url += "&days=" + days;
    return url;
  };

  /**
   * Get the scan page URL for this token.
   * @returns {string}
   */
  DevFridgeSDK.prototype.getScanUrl = function () {
    return this.scannerUrl + "/t/" + this.tokenMint;
  };

  /**
   * Get the badge image URL.
   * @param {Object} [opts]
   * @param {"dark"|"light"} [opts.theme="dark"]
   * @param {"full"|"compact"} [opts.style="compact"]
   * @returns {string}
   */
  DevFridgeSDK.prototype.getBadgeUrl = function (opts) {
    opts = opts || {};
    return (
      this.scannerUrl +
      "/api/badge?mint=" +
      encodeURIComponent(this.tokenMint) +
      "&theme=" +
      (opts.theme || "dark") +
      "&style=" +
      (opts.style || "compact")
    );
  };

  /**
   * Get embeddable badge HTML.
   * @param {Object} [opts]
   * @param {"dark"|"light"} [opts.theme="dark"]
   * @param {"full"|"compact"} [opts.style="compact"]
   * @returns {string}
   */
  DevFridgeSDK.prototype.getBadgeHtml = function (opts) {
    var imgUrl = this.getBadgeUrl(opts);
    var scanUrl = this.getScanUrl();
    return (
      '<a href="' +
      scanUrl +
      '" target="_blank" rel="noopener">' +
      '<img src="' +
      imgUrl +
      '" alt="DevFridge Lock Status" />' +
      "</a>"
    );
  };

  /**
   * Start polling subscription status at an interval.
   * @param {string} walletAddress
   * @param {function} callback - Called with status object on each check
   * @param {number} [intervalMs=60000]
   * @returns {function} stop - Call to stop polling
   */
  DevFridgeSDK.prototype.startPolling = function (walletAddress, callback, intervalMs) {
    intervalMs = intervalMs || 60000;
    var self = this;
    var lastJson = "";

    function poll() {
      self
        .checkSubscription(walletAddress)
        .then(function (status) {
          var json = JSON.stringify(status);
          if (json !== lastJson) {
            lastJson = json;
            callback(status);
          }
        })
        .catch(function (err) {
          console.error("[DevFridge SDK] poll error:", err);
        });
    }

    poll();
    var id = setInterval(poll, intervalMs);
    return function stop() {
      clearInterval(id);
    };
  };

  // Export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { DevFridgeSDK: DevFridgeSDK };
  } else if (typeof define === "function" && define.amd) {
    define(function () {
      return { DevFridgeSDK: DevFridgeSDK };
    });
  } else {
    global.DevFridgeSDK = DevFridgeSDK;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this);
