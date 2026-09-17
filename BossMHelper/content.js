(() => {
  // 版本标识 —— 打开 BOSS 页面后按 F12 看到这一行说明用的是新代码
  console.log('[BossMHelper v7.0] loaded — selected-to-downward lazy tasks + safety checks + 1000ms send spacing');
  const { isUnreadFollowUpEligible, canWriteDraft } = BossAssistantShared;
  const { pickConversationRows } = BossAssistantConversationHeuristics;
  const { conversationIdentity, conversationTarget, conversationKey, uniqueConversationTargets, hasSelectedConversationClass, shouldRescanConversation } = BossAssistantConversationTarget;
  const { chooseConversationScrollTarget } = BossAssistantConversationScrollTarget;
  const { nextCollectionScrollTop } = BossAssistantCollectionScroll;
  const { isSendConfirmed } = BossAssistantSendConfirmation;
  const { limitAuditTree } = BossAssistantAuditTree;
  const { buildAuditReport } = BossAssistantAuditReport;
  const { chooseVisibleEditor } = BossAssistantEditorTarget;
  const { shouldUseEditableCommand } = BossAssistantEditorWrite;
  const { chooseMessageContainer } = BossAssistantMessageContainerTarget;
  const { messageStateFromRows } = BossAssistantMessageState;
  const { enterCommand } = BossAssistantSendCommand;
  const { nextTaskAction } = BossAssistantTaskRunner;
  const { POST_SEND_DELAY_MS, downwardSuccessorStep, uniqueVisibleEntries } = BossAssistantDownwardTask;
  let stopRequested = false;

  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  async function waitFor(predicate, timeout = 3000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = predicate();
      if (value) return value;
      await wait(100);
    }
    return null;
  }

  // 等待当前选中会话的聊天区域真正就绪：
  // 1) 消息容器存在并可见
  // 2) 容器里至少出现一条非空消息（消息历史已加载），或容器已渲染占位（空会话）
  // 3) 编辑器（输入框）也可见可写
  // 避免在切换会话后、聊天内容还在加载时写入/发送，导致错发给上一个会话。
  async function waitForChatReady(timeout = 4000) {
    return waitFor(() => {
      const current = selectedEntry();
      if (!current) return null;
      const chat = messageContainer();
      if (!chat) return null;
      const chatRect = chat.getBoundingClientRect();
      if (chatRect.width < 200 || chatRect.height < 120) return null;
      const messages = [...chat.querySelectorAll('li.message-item')].filter((item) => text(item).length > 0);
      // 接受"有消息"或者"空会话已渲染占位"（chat 容器有可见内容即可）
      const hasHistory = messages.length > 0;
      const chatHasContent = hasHistory || (chat.innerText || '').trim().length > 0;
      if (!chatHasContent) return null;
      const editor = inputElement();
      if (!editor) return null;
      const editorRect = editor.getBoundingClientRect();
      if (editorRect.width < 20 || editorRect.height < 10) return null;
      // 编辑器应位于消息容器下方（BOSS 聊天布局：消息在上，输入框在下）
      if (editorRect.top < chatRect.top || editorRect.top > chatRect.bottom + 80) return null;
      return { chat, editor, messageCount: messages.length };
    }, timeout);
  }

  // 清空输入框（兼容 textarea / input / contenteditable），避免上一会话的草稿污染
  function clearInput(input) {
    if (!input) return;
    input.focus();
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      setter ? setter.call(input, '') : (input.value = '');
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: '' }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      const range = document.createRange();
      range.selectNodeContents(input);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const removed = document.execCommand && document.execCommand('delete', false);
      if (!removed) {
        input.textContent = '';
      }
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward', data: '' }));
    }
  }
  const first = (selectors, root = document) => selectors.map((selector) => root.querySelector(selector)).find(Boolean) || null;
  const all = (selectors, root = document) => [...root.querySelectorAll(selectors.join(','))];
  const text = (element) => (element?.innerText || element?.textContent || '').replace(/\s+/g, ' ').trim();

  function searchInput() {
    return document.querySelector('input[placeholder*="联系人"], input[placeholder*="搜索"]');
  }

  function searchPane() {
    const input = searchInput();
    if (!input) return null;
    const inputRect = input.getBoundingClientRect();
    const panes = [];
    let element = input.parentElement;
    while (element && element !== document.body) {
      const rect = element.getBoundingClientRect();
      if (rect.width >= 300 && rect.width <= 800 && rect.height >= 400 && rect.top <= inputRect.top + 8 && rect.left <= inputRect.left + 8) panes.push({ element, rect });
      element = element.parentElement;
    }
    panes.sort((left, right) => (left.rect.width * left.rect.height) - (right.rect.width * right.rect.height));
    return panes[0]?.element || null;
  }

  function conversationContainer() {
    const pane = searchPane();
    const candidates = pane ? [pane, ...pane.querySelectorAll('*')] : all(BossAssistantSelectors.conversationContainer);
    return chooseConversationScrollTarget(candidates) || pane || first(BossAssistantSelectors.conversationContainer);
  }

  function visualConversationItems(container) {
    const input = searchInput();
    if (!input) return [];
    const inputRect = input.getBoundingClientRect();
    const candidates = [...container.querySelectorAll('*')].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        element,
        id: '',
        top: rect.top,
        width: rect.width,
        height: rect.height,
        text: text(element),
        hasAvatar: Boolean(element.querySelector('img, [class*="avatar" i]'))
      };
    });
    return pickConversationRows(candidates, inputRect.bottom).map((candidate) => candidate.element);
  }

  function conversationItems() {
    const container = conversationContainer();
    if (!container) return [];
    const candidates = all(BossAssistantSelectors.conversationItem, container)
      .filter((item) => item !== container && text(item).length > 0);
    const semanticItems = candidates.filter((item) => !candidates.some((other) => other !== item && item.contains(other)));
    const visualItems = visualConversationItems(container);
    return visualItems.length ? visualItems : semanticItems;
  }

  function entryFor(item) {
    const id = item.dataset.chatId || item.dataset.conversationId || item.dataset.sessionId || '';
    const nameBoxText = text(item.querySelector('.friend-content .name-box'));
    const fallbackText = item.innerText || text(item);
    const key = conversationKey(id, nameBoxText, fallbackText);
    const label = conversationKey('', nameBoxText, fallbackText);
    return { key, label: label || '未命名会话', item };
  }

  function selectedEntry() {
    const container = conversationContainer();
    if (!container) return null;
    const classSelected = conversationItems().find(isSelectedConversationRow) || null;
    const visualSelected = conversationItems().find((item) => {
      const background = window.getComputedStyle(item).backgroundColor;
      return background && background !== 'rgba(0, 0, 0, 0)' && background !== 'rgb(255, 255, 255)';
    });
    const selected = classSelected || visualSelected;
    return selected ? entryFor(selected) : null;
  }

  async function collectConversations() {
    const container = conversationContainer();
    if (!container) throw new Error('未找到消息会话列表，请确认已打开 BOSS 直聘消息页。');
    const found = new Map();
    container.scrollTop = 0;
    await wait(500);

    // 【v7.0 兼容逻辑】保留原有列表加载保护：
    // 1) 增加"scrollHeight 还在增长"检测（BOSS 还在 fetch 的话 scrollHeight 会变）
    // 2) 退出条件更保守：连续 6 轮没任何增长（会话数 + scrollHeight）才退出
    // 3) "看起来到底"时按 heightGrowing 分档等：还在 fetch 就多等
    let lastSize = 0;
    let lastHeight = 0;
    let idleRounds = 0;

    for (let round = 0; round < 250 && !stopRequested; round += 1) {
      conversationItems().map(entryFor).forEach((entry) => {
        if (entry.key) found.set(entry.key, conversationTarget(entry, container.scrollTop));
      });
      const scrollHeight = container.scrollHeight;
      const sizeGrowing = found.size > lastSize;
      const heightGrowing = scrollHeight > lastHeight + 2;
      if (sizeGrowing) { lastSize = found.size; idleRounds = 0; }
      if (heightGrowing) { lastHeight = scrollHeight; idleRounds = 0; }

      const current = container.scrollTop;
      const next = nextCollectionScrollTop(current, scrollHeight, container.clientHeight);
      if (next <= current) {
        // 连续 6 轮无任何进展才退出（避免虚拟列表加载过早结束）
        if (idleRounds >= 6) break;
        idleRounds += 1;
        // 还在 fetch（heightGrowing）就多等，没在 fetch 就少等
        await wait(heightGrowing ? 2500 : 1500);
        continue;
      }

      container.scrollTop = next;
      await wait(600);  // v6 是 550，再加 50ms 保险
    }
    return [...found.values()];
  }

  function visibleDownwardTargets(container) {
    const containerRect = container.getBoundingClientRect();
    const scrollTop = Number(container.scrollTop) || 0;
    return uniqueVisibleEntries(conversationItems().map(entryFor))
      .map((entry) => {
        const itemRect = entry.item.getBoundingClientRect();
        return {
          ...conversationTarget(entry, scrollTop),
          position: scrollTop + itemRect.top - containerRect.top
        };
      })
      .sort((left, right) => left.position - right.position);
  }

  function conversationPosition(container, item) {
    if (!container || !item) return null;
    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    return (Number(container.scrollTop) || 0) + itemRect.top - containerRect.top;
  }

  async function nextLazyDownwardTarget(state) {
    const container = conversationContainer();
    if (!container) throw new Error('Conversation list is unavailable.');

    for (let round = 0; round < 40 && !stopRequested; round += 1) {
      const step = downwardSuccessorStep({
        entries: visibleDownwardTargets(container),
        currentKey: state.currentKey,
        processedKeys: state.processedKeys,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        scrollAttempts: state.scrollAttempts,
        anchorPosition: state.anchorPosition
      }, nextCollectionScrollTop);

      if (step.type === 'target') {
        state.scrollAttempts = step.scrollAttempts;
        state.anchorPosition = Number.isFinite(Number(step.target.position)) ? Number(step.target.position) : state.anchorPosition;
        return step.target;
      }

      if (step.type === 'scroll') {
        container.scrollTop = step.scrollTop;
        state.scrollAttempts = step.scrollAttempts;
        await wait(600);
        continue;
      }

      return null;
    }

    return null;
  }

  async function scanConversationCollection() {
    const container = conversationContainer();
    if (!container) throw new Error('Conversation list was not found.');
    const originalScrollTop = container.scrollTop;
    const found = new Set();
    const rounds = [];
    try {
      container.scrollTop = 0;
      await wait(300);
      for (let round = 0; round < 80; round += 1) {
        const entries = conversationItems().map(entryFor).filter((entry) => entry.key);
        const before = found.size;
        entries.forEach((entry) => found.add(entry.key));
        const scrollTop = Math.round(container.scrollTop);
        const scrollHeight = Math.round(container.scrollHeight);
        const clientHeight = Math.round(container.clientHeight);
        rounds.push({
          round,
          scrollTop,
          scrollHeight,
          clientHeight,
          visibleCount: entries.length,
          newKeys: found.size - before,
          atBottom: scrollTop + clientHeight >= scrollHeight - 2
        });
        if (scrollTop + clientHeight >= scrollHeight - 2) break;
        const step = Math.max(220, Math.round(clientHeight * 0.72));
        const next = Math.min(scrollHeight - clientHeight, scrollTop + step);
        if (next <= scrollTop) break;
        container.scrollTop = next;
        await wait(300);
      }
    } finally {
      container.scrollTop = originalScrollTop;
    }
    return buildAuditReport({
      urlPath: location.pathname,
      collectionAudit: { uniqueCount: found.size, rounds, scrollTargets: scrollTargetDescriptors(container) }
    }).collectionAudit;
  }

  function scrollTargetDescriptors(root) {
    const candidates = [root, ...root.querySelectorAll('*')].map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 240),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollTop: Math.round(element.scrollTop),
        scrollHeight: Math.round(element.scrollHeight),
        clientHeight: Math.round(element.clientHeight),
        overflowY: style.overflowY
      };
    }).filter((candidate) => candidate.width > 100 && candidate.height > 20
      && (candidate.scrollHeight > candidate.clientHeight + 2 || /auto|scroll/.test(candidate.overflowY)));
    return candidates.sort((left, right) => (right.scrollHeight - right.clientHeight) - (left.scrollHeight - left.clientHeight));
  }

  async function activateConversation(target, options = {}) {
    const container = conversationContainer();
    if (!container) throw new Error('Conversation list is unavailable.');
    const allowRescan = options.allowRescan !== false;
    if (Number.isFinite(target.scrollTop)) {
      container.scrollTop = target.scrollTop;
      await wait(180);
    }
    let visibleEntries = conversationItems().map(entryFor);
    let fresh = visibleEntries.find((entry) => entry.key === target.key);
    if (allowRescan && shouldRescanConversation(target, visibleEntries)) {
      container.scrollTop = 0;
      await wait(300);
      for (let round = 0; round < 150 && !stopRequested; round += 1) {
        visibleEntries = conversationItems().map(entryFor);
        fresh = visibleEntries.find((entry) => entry.key === target.key);
        if (fresh) break;
        const current = container.scrollTop;
        const next = nextCollectionScrollTop(current, container.scrollHeight, container.clientHeight);
        if (next <= current) break;
        container.scrollTop = next;
        await wait(300);
      }
    }
    if (!fresh) throw new Error('Target conversation was not found after refreshing the current list; skipped to prevent a mis-send.');
    const clickTarget = fresh.item.querySelector('.friend-content') || fresh.item;
    clickTarget.click();
    // v6 补丁：1.2s 经常不够，给 BOSS 切会话 2.5s；如果还没选中，再点一次（第一次可能被 React 吃了）
    let activated = await waitFor(() => selectedEntry()?.key === target.key, 2500);
    if (!activated) {
      clickTarget.click();
      activated = await waitFor(() => selectedEntry()?.key === target.key, 2000);
    }
    if (!activated) throw new Error('Target conversation did not become active; skipped to prevent a mis-send.');
    // 切完会话后再等聊天区域真正就绪（消息历史 + 输入框渲染完成），
    // 防止在聊天内容还在加载时操作输入框，导致错发或草稿污染。
    const chatReady = await waitForChatReady(4000);
    if (!chatReady) {
      // 给页面最后一次补救机会，再做一次轻量检查
      await wait(500);
      if (!selectedEntry() || selectedEntry().key !== target.key) {
        throw new Error('聊天内容未在 4 秒内加载完成，已跳过该会话以避免误发。');
      }
    }
  }

  function messageState() {
    const container = messageContainer();
    if (!container) return { isOutgoing: false, isRead: false, hasReplyAfter: true };
    const rows = [...container.querySelectorAll('li.message-item')].map((row) => ({
      className: String(row.className || ''),
      statusClassNames: [...row.querySelectorAll('.message-status')].map((status) => String(status.className || ''))
    }));
    return messageStateFromRows(rows);
  }

  function inputElement() {
    const candidates = all(BossAssistantSelectors.input).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        element,
        width: rect.width,
        height: rect.height,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0
      };
    });
    return chooseVisibleEditor(candidates);
  }

  function messageContainerInfo() {
    const editor = inputElement();
    const editorRect = editor?.getBoundingClientRect();
    const candidates = all(BossAssistantSelectors.messageContainer).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        element,
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 240),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: rect.width > 20 && rect.height > 10 && style.display !== 'none' && style.visibility !== 'hidden'
      };
    }).filter((candidate) => candidate.visible);
    const chosenContainer = chooseMessageContainer(candidates, editorRect ? {
      left: editorRect.left,
      top: editorRect.top,
      width: editorRect.width,
      height: editorRect.height
    } : null);
    return { candidates, chosenContainer };
  }

  function messageContainer() {
    return messageContainerInfo().chosenContainer?.element || null;
  }

  function messageContainerChildren(container) {
    if (!container) return [];
    return [...container.children].map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 240),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        childClasses: [...element.children].slice(0, 8).map((child) => String(child.className || '').slice(0, 160))
      };
    });
  }
  function setInput(value) {
    const input = inputElement();
    if (!input) throw new Error('未找到消息输入框。');
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
      setter ? setter.call(input, value) : (input.value = value);
      input.focus();
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) }));
    } else {
      input.focus();
      const range = document.createRange();
      range.selectNodeContents(input);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const rect = input.getBoundingClientRect();
      const style = window.getComputedStyle(input);
      const visible = rect.width > 20 && rect.height > 10 && style.display !== 'none' && style.visibility !== 'hidden';
      const inserted = shouldUseEditableCommand({ isContentEditable: input.isContentEditable, visible })
        && document.execCommand('insertText', false, value);
      if (!inserted) {
        input.textContent = value;
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
      }
    }
    return input;
  }

  function sendButton() {
    return all(BossAssistantSelectors.sendButton).find((button) => /^(发送|send)$/i.test(text(button)) && !button.disabled) || null;
  }

  function diagnostics() {
    const editors = all(BossAssistantSelectors.input).filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 20 && rect.height > 10;
    }).map((element) => ({ tag: element.tagName.toLowerCase(), editable: element.contentEditable || '', disabled: Boolean(element.disabled) }));
    const sendButtons = all(BossAssistantSelectors.sendButton).filter((element) => /发送|send/i.test(text(element))).map((element) => ({ disabled: Boolean(element.disabled), text: text(element).slice(0, 20) }));
    return { ok: true, conversations: conversationItems().length, editors, sendButtons };
  }

  function descriptor(element) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      className: String(element.className || '').slice(0, 240),
      role: element.getAttribute('role') || '',
      contentEditable: element.contentEditable || '',
      disabled: Boolean(element.disabled),
      classDisabled: Boolean(element.classList?.contains('disabled')),
      matchesDisabled: Boolean(element.matches?.(':disabled')),
      text: text(element),
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }

  function editorCandidates() {
    return all(BossAssistantSelectors.input).map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const value = element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement ? element.value : text(element);
      return {
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 240),
        contentEditable: element.contentEditable || '',
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: rect.width > 20 && rect.height > 10 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0,
        display: style.display,
        visibility: style.visibility,
        focused: document.activeElement === element,
        valueLength: value.length
      };
    });
  }

  function selectedItemFor(element, items) {
    return items.find((item) => item === element || item.contains(element)) || null;
  }

  function auditText(value) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    if (/^\d{1,2}:\d{2}$/.test(normalized)) return '[time]';
    return `[text:${normalized.length}]`;
  }

  function auditAttributes(element) {
    const safe = {};
    for (const attribute of [...element.attributes]) {
      const name = attribute.name;
      const value = attribute.value || '';
      if (name === 'aria-selected' || name === 'aria-current' || name === 'aria-expanded' || name === 'aria-disabled') {
        safe[name] = value;
      } else if (name === 'href') {
        safe[name] = value ? '[present]' : '';
      } else if (name === 'title' || name === 'alt' || name.startsWith('data-')) {
        safe[name] = `[length:${value.length}]`;
      }
    }
    return safe;
  }

  function auditTreeFor(element, depth = 4) {
    const children = [...element.children].slice(0, 12);
    return limitAuditTree({
      tag: element.tagName.toLowerCase(),
      className: String(element.className || '').slice(0, 240),
      role: element.getAttribute('role') || '',
      attributes: auditAttributes(element),
      text: children.length ? '' : auditText(text(element)),
      children: children.map((child) => auditTreeFor(child, Math.max(0, depth - 1)))
    }, depth);
  }

  function selectionSignals(item) {
    const elements = [item, ...item.querySelectorAll('*')];
    const joinedClasses = elements.map((element) => String(element.className || '')).join(' ').toLowerCase();
    const style = window.getComputedStyle(item);
    return {
      ariaSelected: item.getAttribute('aria-selected'),
      ariaCurrent: item.getAttribute('aria-current'),
      hasDescendantAriaSelected: Boolean(item.querySelector('[aria-selected="true"]')),
      hasDescendantAriaCurrent: Boolean(item.querySelector('[aria-current]')),
      selectionClassHint: /(^|\s)(active|selected|current)(\s|$)/.test(joinedClasses),
      backgroundColor: style.backgroundColor,
      outlineStyle: style.outlineStyle
    };
  }

  function isSelectedConversationRow(item) {
    return [...item.querySelectorAll('.friend-content')]
      .some((element) => hasSelectedConversationClass(element.className));
  }

  function textFieldSummary(element, path = 'text', depth = 4) {
    if (!element) return null;
    const children = [...element.children].slice(0, 8);
    return {
      path,
      tag: element.tagName.toLowerCase(),
      className: String(element.className || '').slice(0, 160),
      textLength: text(element).length,
      childCount: children.length,
      children: depth > 0 ? children.map((child, index) => textFieldSummary(child, `${path}.${index}`, depth - 1)) : []
    };
  }

  function currentMessageAudit() {
    const containerInfo = messageContainerInfo();
    const container = containerInfo.chosenContainer?.element || null;
    const auditContext = {
      containerCandidates: containerInfo.candidates,
      chosenContainer: containerInfo.chosenContainer,
      containerChildren: messageContainerChildren(container)
    };
    if (!container) return { messageCount: 0, messages: [], ...auditContext };
    const raw = all(BossAssistantSelectors.messageItem, container).filter((element) => text(element).length > 0);
    const messages = raw.filter((element) => !raw.some((other) => other !== element && element.contains(other)));
    return {
      ...auditContext,
      messageCount: messages.length,
      messages: messages.slice(-6).map((element) => {
        const rect = element.getBoundingClientRect();
        const classNames = [element, element.parentElement, ...element.querySelectorAll('*')]
          .map((node) => String(node?.className || ''))
          .filter(Boolean);
        const statusNodes = [element, ...element.querySelectorAll('*')].map((node) => {
          const token = text(node).match(/^[\[\(（]?(已读|未读|送达|已送达|未送达)[\]\)）]?$/)?.[1];
          if (!token) return null;
          const nodeRect = node.getBoundingClientRect();
          const ancestors = [];
          let ancestor = node.parentElement;
          while (ancestor && ancestor !== container && ancestors.length < 5) {
            const ancestorRect = ancestor.getBoundingClientRect();
            ancestors.push({
              tag: ancestor.tagName.toLowerCase(),
              className: String(ancestor.className || '').slice(0, 240),
              top: Math.round(ancestorRect.top),
              left: Math.round(ancestorRect.left),
              width: Math.round(ancestorRect.width),
              height: Math.round(ancestorRect.height)
            });
            ancestor = ancestor.parentElement;
          }
          return {
            tag: node.tagName.toLowerCase(),
            className: String(node.className || '').slice(0, 240),
            parentClassName: String(node.parentElement?.className || '').slice(0, 240),
            token,
            top: Math.round(nodeRect.top),
            left: Math.round(nodeRect.left),
            width: Math.round(nodeRect.width),
            height: Math.round(nodeRect.height),
            ancestors
          };
        }).filter(Boolean);
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || '').slice(0, 240),
          parentClassName: String(element.parentElement?.className || '').slice(0, 240),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          textLength: text(element).length,
          stateClassHints: classNames.filter((name) => /(read|unread|status|self|mine|outgoing|incoming|left|right|send)/i.test(name)).slice(0, 12),
          statusNodes
        };
      })
    };
  }

  function auditPage() {
    const items = conversationItems();
    const classSelected = items.find(isSelectedConversationRow) || null;
    const visualSelected = items.find((item) => {
      const background = window.getComputedStyle(item).backgroundColor;
      return background && background !== 'rgba(0, 0, 0, 0)' && background !== 'rgb(255, 255, 255)';
    });
    const candidates = items.map((item) => {
      const entry = entryFor(item);
      const data = {};
      Object.keys(item.dataset).forEach((key) => { data[key] = item.dataset[key]; });
      return {
        ...descriptor(item),
        key: entry.key,
        label: entry.label,
        dataKeys: Object.keys(data),
        data,
        signals: selectionSignals(item),
        tree: auditTreeFor(item),
        textFields: textFieldSummary(item.querySelector('.friend-content > .text') || item.querySelector('.text'))
      };
    });
    const classItem = selectedItemFor(classSelected, items);
    const visualItem = selectedItemFor(visualSelected, items);
    return buildAuditReport({
      urlPath: location.pathname,
      candidates,
      classSelectedKey: classItem ? entryFor(classItem).key : null,
      visualSelectedKey: visualItem ? entryFor(visualItem).key : null,
      composer: descriptor(inputElement()),
      editorCandidates: editorCandidates(),
      messageAudit: currentMessageAudit(),
      sendButton: descriptor(all(BossAssistantSelectors.sendButton).find((element) => /发送|send/i.test(text(element))) || null)
    });
  }

  async function previewSelections() {
    const targets = uniqueConversationTargets(conversationItems().map(entryFor), 3)
      .map((entry) => conversationTarget(entry, null));
    if (!targets.length) throw new Error('No visible conversations were found for the selection preview.');
    const result = { tested: targets.length, selected: 0, failed: 0, reasons: [] };
    for (const target of targets) {
      try {
        await activateConversation(target);
        if (selectedEntry()?.key !== target.key) throw new Error('Selected conversation key did not match the intended row.');
        result.selected += 1;
      } catch (error) {
        result.failed += 1;
        if (!result.reasons.includes(error.message)) result.reasons.push(error.message);
      }
    }
    return result;
  }

  async function draftCurrent(template, replaceExisting = false) {
    const current = selectedEntry();
    if (!current) throw new Error('Select a conversation before writing a draft.');
    // 等聊天区域就绪，避免读到/写到上一会话的草稿
    await waitForChatReady(4000);
    const input = inputElement();
    if (!input) throw new Error('Message editor was not found.');
    const existing = input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement ? input.value : text(input);
    if (!canWriteDraft(existing, template) && !replaceExisting) {
      if (replaceExisting) {
        clearInput(input);
        await wait(80);
      } else {
        throw new Error(`The message editor already contains a ${existing.length}-character draft, so it was not changed.`);
      }
    }
    const editor = setInput(template);
    await wait(500);
    const editorValue = editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement ? editor.value : text(editor);
    const pageButton = all(BossAssistantSelectors.sendButton).find((element) => element.classList.contains('btn-send')) || null;
    const sendEnabled = Boolean(pageButton) && !pageButton.classList.contains('disabled') && !pageButton.matches(':disabled');
    return {
      editorMatches: editorValue === template,
      editorValueLength: editorValue.length,
      sendEnabled,
      replacedExistingDraft: Boolean(existing.trim())
    };
  }

  function editorValue(element) {
    return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement ? element.value : text(element);
  }

  async function sendCurrent(template) {
    if (!selectedEntry()) throw new Error('Select a conversation before sending.');
    // 先等聊天区域就绪，再重新获取当前会话对应的输入框（避免抓到上一会话的 input）
    await waitForChatReady(4000);
    const input = inputElement();
    if (!input) throw new Error('Message editor was not found.');
    const existing = editorValue(input);
    if (existing && existing !== template) {
      // 输入框有遗留草稿（很可能是上一会话的），先清空再写入
      clearInput(input);
      await wait(80);
    }
    setInput(template);
    await wait(250);
    if (editorValue(input) !== template) throw new Error('The visible message editor did not accept the template.');
    const command = enterCommand();
    const tryPressEnter = async () => {
      input.focus();
      // 用 jQuery/Vue/React 都识别的组合：keydown + keypress + keyup，
      // 避免 React 合成事件因为缺一类事件而丢弃。
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...command }));
      input.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true, ...command }));
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...command }));
    };
    const isConfirmed = () => {
      const container = messageContainer();
      const newest = container ? text(all(BossAssistantSelectors.messageItem, container).filter((item) => text(item)).at(-1)) : '';
      return isSendConfirmed({ editorText: editorValue(input), newestMessageText: newest, template });
    };
    // 第一次尝试：超时 6s（之前是 4s，给网络慢的会话多留点余地）
    await tryPressEnter();
    let confirmed = await waitFor(isConfirmed, 6000);
    if (!confirmed) {
      // 第一次没确认，多半是 React 那帧事件被丢了。
      // 重试：清空、重写、聚焦、再按一次 Enter。
      clearInput(input);
      await wait(80);
      setInput(template);
      await wait(200);
      if (editorValue(input) !== template) {
        throw new Error('The visible message editor did not accept the template on retry.');
      }
      await tryPressEnter();
      confirmed = await waitFor(isConfirmed, 6000);
    }
    if (!confirmed) {
      throw new Error('The page did not confirm that the message was sent.');
    }
    return { sent: 1 };
  }

  async function runWakeTask(template, exclusions) {
    stopRequested = false;
    const exclusionKeys = new Set((exclusions || []).map((entry) => entry.key));
    const result = { sent: 0, skipped: 0, failed: 0, stopped: false, failureReasons: [] };
    const current = selectedEntry();
    if (!current) throw new Error('Select a conversation before starting the downward task.');
    const state = {
      currentKey: current.key,
      processedKeys: new Set(),
      scrollAttempts: 0,
      anchorPosition: conversationPosition(conversationContainer(), current.item)
    };
    let conversation = null;
    while (!stopRequested) {
      if (!conversation) {
        try {
          conversation = await nextLazyDownwardTarget(state);
        } catch (error) {
          result.failed += 1;
          if (!result.failureReasons.includes(error.message)) result.failureReasons.push(error.message);
          chrome.runtime.sendMessage({ type: 'PROGRESS', label: `Downward successor: ${error.message}`, result });
          await wait(500);
          break;
        }
      }
      if (!conversation) break;
      state.processedKeys.add(conversation.key);
      state.currentKey = conversation.key;
      let lockedSuccessor = null;
      let successorError = null;
      try {
        // Lock the next row before sending: BOSS may move the current row after a successful send.
        lockedSuccessor = await nextLazyDownwardTarget(state);
      } catch (error) {
        successorError = error;
      }
      if (nextTaskAction(conversation, exclusionKeys).type === 'skip') {
        result.skipped += 1;
      } else {
        chrome.runtime.sendMessage({ type: 'PROGRESS', label: conversation.label, result });
        try {
          await activateConversation(conversation, { allowRescan: false });
          await sendCurrent(template);
          result.sent += 1;
          await wait(POST_SEND_DELAY_MS);
        } catch (error) {
        // 单个会话失败不应中断整个任务 —— 记下失败原因，跳过这个会话继续处理下一个。
          result.failed += 1;
          if (!result.failureReasons.includes(error.message)) result.failureReasons.push(error.message);
          chrome.runtime.sendMessage({ type: 'PROGRESS', label: `${conversation.label}：${error.message}`, result });
          await wait(500);
        }
      }
      if (successorError) {
        result.failed += 1;
        if (!result.failureReasons.includes(successorError.message)) result.failureReasons.push(successorError.message);
        chrome.runtime.sendMessage({ type: 'PROGRESS', label: `Downward successor: ${successorError.message}`, result });
        await wait(500);
        break;
      }
      conversation = lockedSuccessor;
    }
    if (stopRequested) result.stopped = true;
    chrome.runtime.sendMessage({ type: 'TASK_COMPLETE', result });
    return result;
  }

  async function runFollowUpTask(template, exclusions) {
    stopRequested = false;
    const exclusionKeys = new Set((exclusions || []).map((entry) => entry.key));
    const result = { sent: 0, skipped: 0, failed: 0, stopped: false, failureReasons: [] };
    const current = selectedEntry();
    if (!current) throw new Error('Select a conversation before starting the downward task.');
    const state = {
      currentKey: current.key,
      processedKeys: new Set(),
      scrollAttempts: 0,
      anchorPosition: conversationPosition(conversationContainer(), current.item)
    };
    let conversation = null;
    while (!stopRequested) {
      if (!conversation) {
        try {
          conversation = await nextLazyDownwardTarget(state);
        } catch (error) {
          result.failed += 1;
          if (!result.failureReasons.includes(error.message)) result.failureReasons.push(error.message);
          chrome.runtime.sendMessage({ type: 'PROGRESS', label: `Downward successor: ${error.message}`, result });
          await wait(500);
          break;
        }
      }
      if (!conversation) break;
      state.processedKeys.add(conversation.key);
      state.currentKey = conversation.key;
      let lockedSuccessor = null;
      let successorError = null;
      try {
        // Lock the next row before sending: BOSS may move the current row after a successful send.
        lockedSuccessor = await nextLazyDownwardTarget(state);
      } catch (error) {
        successorError = error;
      }
      if (nextTaskAction(conversation, exclusionKeys).type === 'skip') {
        result.skipped += 1;
      } else {
        chrome.runtime.sendMessage({ type: 'PROGRESS', label: conversation.label, result });
        try {
          await activateConversation(conversation, { allowRescan: false });
          await wait(250);
          if (!isUnreadFollowUpEligible(messageState())) {
            result.skipped += 1;
          } else {
            await sendCurrent(template);
            result.sent += 1;
            await wait(POST_SEND_DELAY_MS);
          }
        } catch (error) {
        // 单个会话失败不应中断整个任务 —— 记下失败原因，跳过这个会话继续处理下一个。
          result.failed += 1;
          if (!result.failureReasons.includes(error.message)) result.failureReasons.push(error.message);
          chrome.runtime.sendMessage({ type: 'PROGRESS', label: `${conversation.label}：${error.message}`, result });
          await wait(500);
        }
        }
      if (successorError) {
        result.failed += 1;
        if (!result.failureReasons.includes(successorError.message)) result.failureReasons.push(successorError.message);
        chrome.runtime.sendMessage({ type: 'PROGRESS', label: `Downward successor: ${successorError.message}`, result });
        await wait(500);
        break;
      }
      conversation = lockedSuccessor;
    }
    if (stopRequested) result.stopped = true;
    chrome.runtime.sendMessage({ type: 'TASK_COMPLETE', result });
    return result;
  }

  async function sendTemplate(template) {
    // 等聊天区域就绪，避免切完会话、消息还在加载时写入
    const ready = await waitForChatReady(4000);
    if (!ready) throw new Error('聊天内容未在 4 秒内加载完成，已跳过该会话以避免误发。');
    // 写入前先清空，避免上一会话的草稿残留
    const input = inputElement();
    if (input) clearInput(input);
    await wait(80);
    setInput(template);
    const nativeResult = await chrome.runtime.sendMessage({ type: 'NATIVE_SEND', text: template });
    if (!nativeResult?.ok) throw new Error(nativeResult?.error || '真实键盘发送未启动。');
    const confirmed = await waitFor(() => {
      const currentInput = inputElement();
      const remaining = currentInput instanceof HTMLInputElement || currentInput instanceof HTMLTextAreaElement ? currentInput.value : text(currentInput);
      const container = messageContainer();
      const newest = container ? text(all(BossAssistantSelectors.messageItem, container).filter((item) => text(item)).at(-1)) : '';
      return isSendConfirmed({ editorText: remaining, newestMessageText: newest, template });
    }, 4000);
    if (!confirmed) throw new Error('消息未被页面确认：编辑器内容未清空且未出现新消息。');
  }

  async function runTask({ mode, template, exclusions, onlyCurrent }) {
    stopRequested = false;
    const exclusionKeys = new Set((exclusions || []).map((entry) => entry.key));
    const result = { sent: 0, skipped: 0, failed: 0, stopped: false, failureReasons: [] };
    const current = onlyCurrent ? selectedEntry() : null;
    if (onlyCurrent && !current) throw new Error('未识别当前选中的会话，请先在左侧列表点击一位面试官。');
    const conversations = onlyCurrent ? [conversationTarget(current, null)] : await collectConversations();
    for (const conversation of conversations) {
      if (stopRequested) { result.stopped = true; break; }
      if (exclusionKeys.has(conversation.key)) { result.skipped += 1; continue; }
      chrome.runtime.sendMessage({ type: 'PROGRESS', label: conversation.label, result });
      try {
        await activateConversation(conversation);
        if (mode === 'followUp' && !isUnreadFollowUpEligible(messageState())) { result.skipped += 1; continue; }
        await sendTemplate(template);
        result.sent += 1;
        await wait(120);
      } catch (error) {
        result.failed += 1;
        if (!result.failureReasons.includes(error.message)) result.failureReasons.push(error.message);
        chrome.runtime.sendMessage({ type: 'PROGRESS', label: `${conversation.label}：${error.message}`, result });
      }
    }
    chrome.runtime.sendMessage({ type: 'TASK_COMPLETE', result });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_CURRENT_CONVERSATION') {
      const current = selectedEntry();
      sendResponse(current ? { ok: true, entry: { key: current.key, label: current.label } } : { ok: false, error: '请先在消息列表中选择一位面试官。' });
      return;
    }
    if (message.type === 'GET_DIAGNOSTICS') { sendResponse(diagnostics()); return; }
    if (message.type === 'GET_AUDIT') { sendResponse({ ok: true, report: auditPage() }); return; }
    if (message.type === 'SCAN_COLLECTION') {
      scanConversationCollection().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'PREVIEW_SELECTION') {
      previewSelections().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'DRAFT_CURRENT') {
      draftCurrent(message.template).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'REPLACE_DRAFT_CURRENT') {
      draftCurrent(message.template, true).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'SEND_CURRENT') {
      sendCurrent(message.template).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'WAKE_ALL') {
      runWakeTask(message.template, message.exclusions).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'FOLLOW_UP_READ') {
      runFollowUpTask(message.template, message.exclusions).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message.type === 'STOP_TASK') { stopRequested = true; sendResponse({ ok: true }); return; }
    if (message.type === 'START_TASK') {
      sendResponse({ ok: false, error: '安全审计模式已启用：发送任务已关闭。' });
    }
  });
})();
