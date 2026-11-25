'use strict';

const { showDailyResult, showStageResults, openSupporter, supporterStyle, monetizationDialogOpen } = (() => {
  const defaultStyle = Object.freeze({skin:'classic',death:'classic',owned:false});
  const skins = [['classic','Classic'],['golden','Gold'],['fish','Fish'],['apple','Apple']];
  const effects = [['classic','Classic'],['apples','Apple shower']];
  const preferenceKey = 'rageBait.cosmetics';
  let owned = false;
  let statusRequest;
  let appearance = defaultStyle;
  let dialog;
  let currentView = null;
  let returnMessage = '';

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function button(label, action, primary = false) {
    const node = element('button', 'button monetization-button' + (primary ? ' monetization-primary' : ''), label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  function readAppearance() {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
      return {
        skin: skins.some(([id]) => id === saved?.skin) ? saved.skin : 'classic',
        death: effects.some(([id]) => id === saved?.death) ? saved.death : 'classic',
        owned: true
      };
    } catch {
      return {...defaultStyle,owned:true};
    }
  }

  function setAppearance(name, value) {
    appearance = {...appearance,[name]:value};
    try {
      const {skin,death} = appearance;
      localStorage.setItem(preferenceKey, JSON.stringify({skin,death}));
    } catch {}
  }

  function refreshSupporterStatus() {
    if (statusRequest) return statusRequest;
    statusRequest = Promise.resolve().then(async () => {
      try {
        const response = await fetch('/api/supporter/status', {credentials:'same-origin',cache:'no-store'});
        if (!response.ok) throw new Error('Supporter status unavailable');
        const data = await response.json();
        owned = data.owned === true;
        appearance = owned ? readAppearance() : defaultStyle;
        const headerButton = document.getElementById('supporter');
        if (headerButton) headerButton.textContent = owned ? 'Supporter ★' : 'Supporter';
        return {enabled:data.enabled === true,owned};
      } catch {
        return {enabled:false,owned};
      }
    }).finally(() => { statusRequest = null; });
    return statusRequest;
  }

  function getDialog() {
    if (dialog) return dialog;
    dialog = element('dialog','monetization-dialog');
    dialog.setAttribute('aria-labelledby','monetization-heading');
    const host = document.getElementById('play-area') || document.body;
    host.append(dialog);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('close', () => {
      if (!dialog.open) finish();
    });
    return dialog;
  }

  function finish(action) {
    const view = currentView;
    if (!view) return;
    currentView = null;
    view.cleanup?.();
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (typeof action === 'function') action();
    else view.dismiss?.();
  }

  function close() {
    finish();
  }

  function showView({title,context,dismiss,cleanup}) {
    const modal = getDialog();
    currentView?.cleanup?.();
    const body = element('section','monetization-sheet');
    const heading = element('h2','monetization-heading',title);
    heading.id = 'monetization-heading';
    heading.tabIndex = -1;
    if (context) body.append(element('p','monetization-context', context));
    body.append(heading);
    modal.replaceChildren(body);
    const view = {body,dismiss,cleanup};
    currentView = view;
    if (!modal.open) {
      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open','');
    }
    heading.focus();
    return view;
  }

  function summaryStats(pairs) {
    const stats = element('dl','monetization-stats');
    for (const [label,value] of pairs) {
      const item = element('div','monetization-stat');
      item.append(element('dt','',label),element('dd','',String(value)));
      stats.append(item);
    }
    return stats;
  }

  function actionRow(...actions) {
    const group = element('div','monetization-actions');
    group.append(...actions);
    return group;
  }

  function normalDeaths(deaths) {
    return Number.isInteger(deaths) && deaths >= 0 ? deaths.toLocaleString('en-GB') : '0';
  }

  function showDailyResult(result) {
    const best = storeDailyResult(result);
    const displayDate = new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'})
      .format(new Date(result.date + 'T12:00:00Z'));
    function render() {
      const view = showView({title:'Daily challenge clear',context:displayDate,dismiss:result.back});
      const time = formatDailyTime(result.ticks);
      const shareStatus = element('p','monetization-status');
      shareStatus.setAttribute('role','status');
      const shareOutput = element('textarea','monetization-share');
      shareOutput.hidden = true;
      shareOutput.readOnly = true;
      shareOutput.rows = 3;
      shareOutput.setAttribute('aria-label','Shareable challenge result');
      const share = button('Share result',async () => {
        share.disabled = true;
        try {
          const shared = await shareDailyResult(result);
          if (currentView !== view) return;
          if (shared.method === 'cancelled') return;
          if (shared.method === 'text') {
            shareStatus.textContent = 'Your result is ready to copy.';
            shareOutput.value = shared.text || shared.url;
            shareOutput.hidden = false;
            shareOutput.focus();
            shareOutput.select();
          } else shareStatus.textContent = shared.method === 'clipboard' ? 'Result copied.' : 'Result shared.';
        } catch {
          if (currentView === view) shareStatus.textContent = 'Sharing is unavailable right now.';
        } finally {
          share.disabled = false;
        }
      },true);
      view.body.append(element('p','monetization-detail',result.title),
        summaryStats([['Time',time],['Deaths',normalDeaths(result.deaths)]]));
      if (best) {
        view.body.append(element('p','monetization-caption',
          'Your best · ' + formatDailyTime(best.ticks) + ' · ' + normalDeaths(best.deaths) + ' deaths'));
      }
      const actions = [share];
      if (result.retry) actions.push(button('Play again',() => finish(result.retry)));
      actions.push(button(result.back ? 'Campaign' : 'Close',close));
      view.body.append(actionRow(...actions),shareStatus,shareOutput,
        button('Support Rage Bait',() => openSupporter({back:render,dismiss:result.back})));
    }
    render();
  }

  function showStageResults(result) {
    let didAdvance = false;
    let adOffered = false;
    function advance() {
      if (didAdvance) return;
      didAdvance = true;
      result.next?.();
    }
    function render() {
      const ad = element('aside','monetization-ad');
      ad.hidden = true;
      const title = Number.isInteger(result.stage) ? 'Stage ' + result.stage + ' cleared' : 'Stage cleared';
      const view = showView({
        title,
        dismiss:advance,
        cleanup:() => { if (typeof unmountStageAd === 'function') unmountStageAd(ad); }
      });
      if (result.title && result.title !== title) view.body.append(element('p','monetization-detail',result.title));
      const stats = [['Total deaths',normalDeaths(result.deaths)]];
      if (Number.isInteger(result.levels) && result.levels > 0) stats.unshift(['Levels cleared',result.levels]);
      view.body.append(summaryStats(stats),
        actionRow(button('Continue',close,true),button('Support Rage Bait',() => openSupporter({back:render,dismiss:advance}))),
        ad);
      if (!adOffered && typeof mountStageAd === 'function') {
        adOffered = true;
        mountStageAd(ad);
      }
    }
    render();
  }

  function costumePreview(id) {
    const pixel = element('span','monetization-avatar monetization-avatar-' + id);
    pixel.setAttribute('aria-hidden','true');
    return pixel;
  }

  function skinPreview() {
    const grid = element('ul','monetization-costumes');
    for (const [id,label] of skins.slice(1)) {
      const item = element('li','monetization-costume');
      item.append(costumePreview(id),element('span','',label));
      grid.append(item);
    }
    return grid;
  }

  function styleChoices(kind,label,choices) {
    const group = element('fieldset','monetization-choices');
    group.append(element('legend','',label));
    const grid = element('div',kind === 'skin' ? 'monetization-costumes' : 'monetization-actions');
    const buttons = new Map();
    for (const [id,name] of choices) {
      const choice = button(name,() => {
        setAppearance(kind,id);
        for (const [key,node] of buttons) node.setAttribute('aria-pressed',String(key === id));
      });
      if (kind === 'skin') {
        choice.classList.add('monetization-costume');
        choice.prepend(costumePreview(id));
      }
      choice.setAttribute('aria-pressed',String(appearance[kind] === id));
      buttons.set(id,choice);
      grid.append(choice);
    }
    group.append(grid);
    return group;
  }

  async function beginCheckout(view,buttonNode,note) {
    buttonNode.disabled = true;
    note.textContent = 'Opening checkout…';
    try {
      const endpoint = new URL('/api/supporter/checkout',location.origin);
      const challenge = new URL(location.href).searchParams.get('challenge');
      if (challenge && /^\d{4}-\d{2}-\d{2}$/.test(challenge)) endpoint.searchParams.set('challenge',challenge);
      const response = await fetch(endpoint,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:'{}'
      });
      if (!response.ok) throw new Error('Checkout unavailable');
      const {url} = await response.json();
      const checkout = new URL(url);
      if (checkout.origin !== 'https://checkout.stripe.com') throw new Error('Invalid checkout URL');
      if (currentView === view) location.assign(checkout.href);
    } catch {
      buttonNode.disabled = false;
      note.textContent = 'Checkout could not open. Please try again.';
    }
  }

  async function openSupporter({back,dismiss} = {}) {
    const view = showView({title:'Rage Bait supporter pack',dismiss});
    const price = element('p','monetization-price','£1.99');
    price.append(element('span','','one-time purchase'));
    const choices = element('div','monetization-supporter-content');
    choices.append(skinPreview(),element('p','monetization-detail','Three skins, an apple shower death effect, and a supporter badge. Unlocks in this browser.'));
    const note = element('p','monetization-status','Checking checkout availability…');
    note.setAttribute('role','status');
    const privacy = element('a','monetization-privacy','Privacy');
    privacy.href = '/privacy';
    privacy.target = '_blank';
    privacy.rel = 'noopener';
    const actions = actionRow(back ? button('Back',back) : button('Close',close),privacy);
    view.body.append(price,choices,note,actions);
    const status = await refreshSupporterStatus();
    if (currentView !== view) return;
    if (status.owned) {
      choices.replaceChildren(styleChoices('skin','Skin',skins),styleChoices('death','Death effect',effects));
      note.textContent = returnMessage || 'Your supporter pack is unlocked.';
    } else if (status.enabled) {
      const buy = button('Buy for £1.99',() => beginCheckout(view,buy,note),true);
      actions.prepend(buy);
      note.textContent = returnMessage;
    } else {
      note.textContent = returnMessage || 'Checkout is being set up.';
    }
    returnMessage = '';
  }

  function initializeSupporter() {
    const supportButton = document.getElementById('supporter');
    supportButton?.addEventListener('click',() => openSupporter());
    refreshSupporterStatus();
    const url = new URL(location.href);
    const marker = url.searchParams.get('supporter');
    const messages = {
      pending:'Payment verification is pending. Check back shortly.',
      unavailable:'The purchase could not be verified.',
      canceled:'Checkout closed.'
    };
    if (marker === 'success' || Object.hasOwn(messages,marker || '')) {
      returnMessage = messages[marker] || '';
      url.searchParams.delete('supporter');
      history.replaceState(history.state,'',url.href);
      requestAnimationFrame(() => openSupporter());
    }
  }

  if (typeof document !== 'undefined' && typeof location !== 'undefined') initializeSupporter();
  return {
    showDailyResult, showStageResults, openSupporter,
    supporterStyle:() => appearance,
    monetizationDialogOpen:() => Boolean(currentView)
  };
})();
