'use strict';

const stageAdMounts = new WeakMap();
const stageAdConsentListeners = new Set();
let stageAdSettings;
let stageAdScript;
let stageAdConsent = false;
let stageAdConsentSubscribed = false;

function getStageAdSettings() {
  if (!stageAdSettings) {
    stageAdSettings = fetch('/api/site-config', {credentials:'same-origin'})
      .then(response => response.ok ? response.json() : null)
      .then(config => {
        const ads = config?.ads;
        return ads?.cmp === 'google' &&
          /^ca-pub-\d{16}$/.test(ads.publisher) &&
          /^\d{5,20}$/.test(ads.slot) ? ads : null;
      })
      .catch(() => null);
  }
  return stageAdSettings;
}

function listenForStageAdConsent() {
  if (stageAdConsentSubscribed || typeof window.__tcfapi !== 'function') return;
  stageAdConsentSubscribed = true;
  window.__tcfapi('addEventListener', 2, (data, success) => {
    const decided = data?.eventStatus === 'tcloaded' || data?.eventStatus === 'useractioncomplete';
    const purposes = data?.purpose?.consents;
    const affirmative = data?.gdprApplies === true && decided &&
      data.cmpStatus === 'loaded' && Boolean(data.tcString) &&
      data.vendor?.consents?.[755] === true &&
      purposes?.[1] === true && purposes[3] === true && purposes[4] === true;
    stageAdConsent = Boolean(success && (data?.gdprApplies === false || affirmative));

    const privacy = document.getElementById('ad-privacy');
    if (privacy && success && data?.gdprApplies === true &&
        typeof window.googlefc?.showRevocationMessage === 'function') {
      privacy.hidden = false;
      privacy.onclick = () => window.googlefc.showRevocationMessage();
    }
    for (const listener of stageAdConsentListeners) listener();
  });
}

function loadStageAdScript(publisher) {
  if (!stageAdScript) {
    stageAdScript = new Promise(resolve => {
      // The tag starts the published Google consent message. Ad requests are made
      // separately, once the current stage's finished screen has consent.
      window.googlefc ||= {};
      window.googlefc.callbackQueue ||= [];
      window.googlefc.callbackQueue.push({CONSENT_API_READY:listenForStageAdConsent});
      window.adsbygoogle ||= [];
      const source = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + publisher;
      const verification = document.getElementById('adsense-verification');
      const onLoad = () => {
        listenForStageAdConsent();
        resolve(true);
      };
      const onError = () => resolve(false);
      if (verification?.src === source) {
        if (verification.dataset.loadState === 'loaded') onLoad();
        else if (verification.dataset.loadState === 'failed') onError();
        else {
          verification.addEventListener('load', onLoad, {once:true});
          verification.addEventListener('error', onError, {once:true});
        }
        return;
      }
      const script = document.createElement('script');
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = source;
      script.addEventListener('load', onLoad, {once:true});
      script.addEventListener('error', onError, {once:true});
      document.head.append(script);
    });
  }
  return stageAdScript;
}

async function initializeStageAds() {
  const ads = await getStageAdSettings();
  return ads ? loadStageAdScript(ads.publisher) : false;
}

function unmountStageAd(container) {
  if (!container) return;
  const mount = stageAdMounts.get(container);
  if (mount?.consentListener) stageAdConsentListeners.delete(mount.consentListener);
  mount?.observer?.disconnect();
  stageAdMounts.delete(container);
  container.replaceChildren();
  container.hidden = true;
}

async function mountStageAd(container) {
  if (!container || stageAdMounts.has(container)) return;
  container.hidden = true;
  const mount = {requested:false};
  stageAdMounts.set(container, mount);
  const current = () => stageAdMounts.get(container) === mount && container.isConnected;
  const ads = await getStageAdSettings();
  if (!ads || !current() || !await loadStageAdScript(ads.publisher) || !current()) return;
  mount.consentListener = () => {
    if (!current()) return;
    if (!stageAdConsent) {
      if (mount.requested) unmountStageAd(container);
      return;
    }
    if (mount.requested) return;
    container.hidden = false;
    if (container.getBoundingClientRect().width < 250) {
      unmountStageAd(container);
      return;
    }
    const label = document.createElement('p');
    label.className = 'stage-ad-label';
    label.textContent = 'Advertisements';
    const unit = document.createElement('ins');
    unit.className = 'adsbygoogle';
    unit.style.display = 'block';
    unit.dataset.adClient = ads.publisher;
    unit.dataset.adSlot = ads.slot;
    unit.dataset.adFormat = 'horizontal';
    unit.dataset.fullWidthResponsive = 'false';
    container.append(label, unit);
    mount.requested = true;
    if (typeof MutationObserver === 'function') {
      mount.observer = new MutationObserver(() => {
        if (unit.dataset.adStatus === 'unfilled') unmountStageAd(container);
      });
      mount.observer.observe(unit, {attributes:true, attributeFilter:['data-ad-status']});
    }
    try {
      window.adsbygoogle.push({});
    } catch {
      unmountStageAd(container);
    }
  };
  stageAdConsentListeners.add(mount.consentListener);
  mount.consentListener();
}
