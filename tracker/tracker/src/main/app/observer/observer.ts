import {
  RemoveNodeAttribute,
  SetNodeAttribute,
  SetNodeAttributeURLBased,
  SetCSSDataURLBased,
  SetNodeData,
  CreateTextNode,
  CreateElementNode,
  MoveNode,
  RemoveNode,
} from "../../../common/messages.js";
import App from "../index.js";
import { 
  isRootNode,
  isTextNode,
  isElementNode,
  isSVGElement,
  hasTag,
} from "../guards.js";

function isIgnored(node: Node): boolean {
  if (isTextNode(node)) { return false }
  if (!isElementNode(node)) { return true }
  const tag = node.tagName.toUpperCase();
  if (tag === 'LINK') {
    const rel = node.getAttribute('rel');
    const as = node.getAttribute('as');
    return !(rel?.includes('stylesheet') || as === "style" || as === "font");
  }
  return (
    tag === 'SCRIPT' ||
    tag === 'NOSCRIPT' ||
    tag === 'META' ||
    tag === 'TITLE' ||
    tag === 'BASE'
  );
}

function isObservable(node: Node): boolean {
  if (isRootNode(node)) { return true }
  return !isIgnored(node)
}


/*
  TODO:
    - fix unbinding logic + send all removals first (ensure sequence is correct)
    - use document as a 0-node in the upper context
*/

export default abstract class Observer {
  private readonly observer: MutationObserver;
  private readonly commited: Array<boolean | undefined> = [];
  private readonly recents: Array<boolean | undefined> = [];
  private readonly myNodes: Array<boolean | undefined> = [];
  private readonly indexes: Array<number> = [];
  private readonly attributesList: Array<Set<string> | undefined> = [];
  private readonly textSet: Set<number> = new Set();
  constructor(protected readonly app: App, protected readonly isTopContext = false) {
    this.observer = new MutationObserver(
      this.app.safe((mutations) => {
        for (const mutation of mutations) {  // mutations order is sequential
          const target = mutation.target;
          const type = mutation.type;

          if (!isObservable(target)) {
            continue;
          }
          if (type === 'childList') {
            for (let i = 0; i < mutation.removedNodes.length; i++) {
              this.bindTree(mutation.removedNodes[i]);
            }
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              this.bindTree(mutation.addedNodes[i]);
            }
            continue;
          }
          const id = this.app.nodes.getID(target);
          if (id === undefined) {
            continue;
          }
          if (id >= this.recents.length) { // TODO: something more convinient
            this.recents[id] = undefined;
          }
          if (type === 'attributes') {
            const name = mutation.attributeName;
            if (name === null) {
              continue;
            }
            let attr = this.attributesList[id];
            if (attr === undefined) {
              this.attributesList[id] = attr = new Set();
            }
            attr.add(name);
            continue;
          }
          if (type === 'characterData') {
            this.textSet.add(id);
            continue;
          }
        }
        this.commitNodes();
      }),
    );
  }
  private clear(): void {
    this.commited.length = 0;
    this.recents.length = 0;
    this.indexes.length = 1;
    this.attributesList.length = 0;
    this.textSet.clear();
  }

  private sendNodeAttribute(
    id: number,
    node: Element,
    name: string,
    value: string | null,
  ): void {
    if (isSVGElement(node)) {
      if (name.substr(0, 6) === 'xlink:') {
        name = name.substr(6);
      }
      if (value === null) {
        this.app.send(new RemoveNodeAttribute(id, name));
      } else if (name === 'href') {
        if (value.length > 1e5) {
          value = '';
        }
        this.app.send(new SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()));
      } else {
        this.app.send(new SetNodeAttribute(id, name, value));
      }
      return;
    }
    if (
      name === 'src' ||
      name === 'srcset' ||
      name === 'integrity' ||
      name === 'crossorigin' ||
      name === 'autocomplete' ||
      name.substr(0, 2) === 'on'
    ) {
      return;
    }
    if (
      name === 'value' &&
      hasTag(node, "INPUT") &&
      node.type !== 'button' &&
      node.type !== 'reset' &&
      node.type !== 'submit'
    ) {
      return;
    }
    if (value === null) {
      this.app.send(new RemoveNodeAttribute(id, name));
      return;
    }
    if (name === 'style' || name === 'href' && hasTag(node, "LINK")) {
      this.app.send(new SetNodeAttributeURLBased(id, name, value, this.app.getBaseHref()));
      return;
    }
    if (name === 'href' || value.length > 1e5) {
      value = '';
    }
    this.app.send(new SetNodeAttribute(id, name, value));
  }

  private sendNodeData(id: number, parentElement: Element, data: string): void {
    if (hasTag(parentElement, "STYLE") || hasTag(parentElement, "style")) {
      this.app.send(new SetCSSDataURLBased(id, data, this.app.getBaseHref()));
      return;
    }
    data = this.app.sanitizer.sanitize(id, data)
    this.app.send(new SetNodeData(id, data));
  }

  private bindNode(node: Node): void {
    const r = this.app.nodes.registerNode(node);
    const id = r[0];
    this.recents[id] = r[1] || this.recents[id] || false;

    this.myNodes[id] = true;
  }

  private bindTree(node: Node): void {
    if (!isObservable(node)) {
      return
    }
    this.bindNode(node);
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          isIgnored(node) || this.app.nodes.getID(node) !== undefined
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      },
      // @ts-ignore
      false,
    );
    while (walker.nextNode()) {
      this.bindNode(walker.currentNode);
    }
  }

  private unbindNode(node: Node): void {
    const id = this.app.nodes.unregisterNode(node);
    if (id !== undefined && this.recents[id] === false) {
      this.app.send(new RemoveNode(id));
    }
  }

  // A top-consumption function on the infinite lists test. (~1% of performance resources)
  private _commitNode(id: number, node: Node): boolean {
    if (isRootNode(node)) {
      return true;
    }
    const parent = node.parentNode;
    let parentID: number | undefined;

    // Disable parent check for the upper context HTMLHtmlElement, because it is root there... (before)
    // TODO: get rid of "special" cases (there is an issue with CreateDocument altered behaviour though)
    // TODO: Clean the logic (though now it workd fine)
    if (!hasTag(node, "HTML") || !this.isTopContext) {
      if (parent === null) {
        this.unbindNode(node);
        return false;
      }
      parentID = this.app.nodes.getID(parent);
      if (parentID === undefined) {
        this.unbindNode(node);
        return false;
      }
      if (!this.commitNode(parentID)) {
        this.unbindNode(node);
        return false;
      }
      this.app.sanitizer.handleNode(id, parentID, node);
      if (this.app.sanitizer.isMaskedContainer(parentID)) {
        return false;
      }
    }
    // From here parentID === undefined if node is top context HTML node
    let sibling = node.previousSibling;
    while (sibling !== null) {
      const siblingID = this.app.nodes.getID(sibling);
      if (siblingID !== undefined) {
        this.commitNode(siblingID);
        this.indexes[id] = this.indexes[siblingID] + 1;
        break;
      }
      sibling = sibling.previousSibling;
    }
    if (sibling === null) {
      this.indexes[id] = 0;
    }
    const isNew = this.recents[id];
    const index = this.indexes[id];
    if (index === undefined) {
      throw 'commitNode: missing node index';
    }
    if (isNew === true) {
      if (isElementNode(node)) {
        let el: Element = node
        if (parentID !== undefined) {
          if (this.app.sanitizer.isMaskedContainer(id)) {
            const width = el.clientWidth;
            const height = el.clientHeight;
            el = node.cloneNode() as Element;
            (el as HTMLElement | SVGElement).style.width = width + 'px';
            (el as HTMLElement | SVGElement).style.height = height + 'px';
          }

          this.app.send(new
            CreateElementNode(
              id,
              parentID,
              index,
              el.tagName,
              isSVGElement(node),
            ),
          );
        }
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          this.sendNodeAttribute(id, el, attr.nodeName, attr.value);
        }
      } else if (isTextNode(node)) {
        // for text node id != 0, hence parentID !== undefined and parent is Element
        this.app.send(new CreateTextNode(id, parentID as number, index));
        this.sendNodeData(id, parent as Element, node.data);
      }
      return true;
    }
    if (isNew === false && parentID !== undefined) {
      this.app.send(new MoveNode(id, parentID, index));
    }
    const attr = this.attributesList[id];
    if (attr !== undefined) {
      if (!isElementNode(node)) {
        throw 'commitNode: node is not an element';
      }
      for (const name of attr) {
        this.sendNodeAttribute(id, node, name, node.getAttribute(name));
      }
    }
    if (this.textSet.has(id)) {
      if (!isTextNode(node)) {
        throw 'commitNode: node is not a text';
      }
      // for text node id != 0, hence parent is Element
      this.sendNodeData(id, parent as Element, node.data);
    }
    return true;
  }
  private commitNode(id: number): boolean {
    const node = this.app.nodes.getNode(id);
    if (node === undefined) {
      return false;
    }
    const cmt = this.commited[id];
    if (cmt !== undefined) {
      return cmt;
    }
    return (this.commited[id] = this._commitNode(id, node));
  }
  private commitNodes(): void {
    let node;
    for (let id = 0; id < this.recents.length; id++) {
      // TODO: make things/logic nice here.
      // commit required in any case if recents[id] true or false (in case of unbinding) or undefined (in case of attr change).
      // Possible solution: separate new node commit (recents) and new attribute/move node commit
      // Otherwise commitNode is called on each node, which might be a lot
      if (!this.myNodes[id]) { continue }
      this.commitNode(id);
      if (this.recents[id] === true && (node = this.app.nodes.getNode(id))) {
        this.app.nodes.callNodeCallbacks(node);
      }
    }
    this.clear();
  }

  // ISSSUE
  protected observeRoot(node: Node, beforeCommit: (id?: number) => unknown, nodeToBind: Node = node) {
    this.observer.observe(node, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
      attributeOldValue: false,
      characterDataOldValue: false,
    });
    this.bindTree(nodeToBind);
    beforeCommit(this.app.nodes.getID(node))
    this.commitNodes();
  }

  disconnect(): void {
    this.observer.disconnect();
    this.clear();
    this.myNodes.length = 0;
  }
}
