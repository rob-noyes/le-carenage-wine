var SECTION_ID_ATTR$1 = 'data-section-id';

function Section(container, properties) {
  this.container = validateContainerElement(container);
  this.id = container.getAttribute(SECTION_ID_ATTR$1);
  this.extensions = [];

  // eslint-disable-next-line es5/no-es6-static-methods
  Object.assign(this, validatePropertiesObject(properties));

  this.onLoad();
}

Section.prototype = {
  onLoad: Function.prototype,
  onUnload: Function.prototype,
  onSelect: Function.prototype,
  onDeselect: Function.prototype,
  onBlockSelect: Function.prototype,
  onBlockDeselect: Function.prototype,

  extend: function extend(extension) {
    this.extensions.push(extension); // Save original extension

    // eslint-disable-next-line es5/no-es6-static-methods
    var extensionClone = Object.assign({}, extension);
    delete extensionClone.init; // Remove init function before assigning extension properties

    // eslint-disable-next-line es5/no-es6-static-methods
    Object.assign(this, extensionClone);

    if (typeof extension.init === 'function') {
      extension.init.apply(this);
    }
  }
};

function validateContainerElement(container) {
  if (!(container instanceof Element)) {
    throw new TypeError(
      'Theme Sections: Attempted to load section. The section container provided is not a DOM element.'
    );
  }
  if (container.getAttribute(SECTION_ID_ATTR$1) === null) {
    throw new Error(
      'Theme Sections: The section container provided does not have an id assigned to the ' +
        SECTION_ID_ATTR$1 +
        ' attribute.'
    );
  }

  return container;
}

function validatePropertiesObject(value) {
  if (
    (typeof value !== 'undefined' && typeof value !== 'object') ||
    value === null
  ) {
    throw new TypeError(
      'Theme Sections: The properties object provided is not a valid'
    );
  }

  return value;
}

// Object.assign() polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target) {
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

/*
 * @shopify/theme-sections
 * -----------------------------------------------------------------------------
 *
 * A framework to provide structure to your Shopify sections and a load and unload
 * lifecycle. The lifecycle is automatically connected to theme editor events so
 * that your sections load and unload as the editor changes the content and
 * settings of your sections.
 */

var SECTION_TYPE_ATTR = 'data-section-type';
var SECTION_ID_ATTR = 'data-section-id';

window.Shopify = window.Shopify || {};
window.Shopify.theme = window.Shopify.theme || {};
window.Shopify.theme.sections = window.Shopify.theme.sections || {};

var registered = (window.Shopify.theme.sections.registered =
  window.Shopify.theme.sections.registered || {});
var instances = (window.Shopify.theme.sections.instances =
  window.Shopify.theme.sections.instances || []);

function register(type, properties) {
  if (typeof type !== 'string') {
    throw new TypeError(
      'Theme Sections: The first argument for .register must be a string that specifies the type of the section being registered'
    );
  }

  if (typeof registered[type] !== 'undefined') {
    throw new Error(
      'Theme Sections: A section of type "' +
        type +
        '" has already been registered. You cannot register the same section type twice'
    );
  }

  function TypedSection(container) {
    Section.call(this, container, properties);
  }

  TypedSection.constructor = Section;
  TypedSection.prototype = Object.create(Section.prototype);
  TypedSection.prototype.type = type;

  return (registered[type] = TypedSection);
}

function load(types, containers) {
  types = normalizeType(types);

  if (typeof containers === 'undefined') {
    containers = document.querySelectorAll('[' + SECTION_TYPE_ATTR + ']');
  }

  containers = normalizeContainers(containers);

  types.forEach(function(type) {
    var TypedSection = registered[type];

    if (typeof TypedSection === 'undefined') {
      return;
    }

    containers = containers.filter(function(container) {
      // Filter from list of containers because container already has an instance loaded
      if (isInstance(container)) {
        return false;
      }

      // Filter from list of containers because container doesn't have data-section-type attribute
      if (container.getAttribute(SECTION_TYPE_ATTR) === null) {
        return false;
      }

      // Keep in list of containers because current type doesn't match
      if (container.getAttribute(SECTION_TYPE_ATTR) !== type) {
        return true;
      }

      instances.push(new TypedSection(container));

      // Filter from list of containers because container now has an instance loaded
      return false;
    });
  });
}

function unload(selector) {
  var instancesToUnload = getInstances(selector);

  instancesToUnload.forEach(function(instance) {
    var index = instances
      .map(function(e) {
        return e.id;
      })
      .indexOf(instance.id);
    instances.splice(index, 1);
    instance.onUnload();
  });
}

function getInstances(selector) {
  var filteredInstances = [];

  // Fetch first element if its an array
  if (NodeList.prototype.isPrototypeOf(selector) || Array.isArray(selector)) {
    var firstElement = selector[0];
  }

  // If selector element is DOM element
  if (selector instanceof Element || firstElement instanceof Element) {
    var containers = normalizeContainers(selector);

    containers.forEach(function(container) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.container === container;
        })
      );
    });

    // If select is type string
  } else if (typeof selector === 'string' || typeof firstElement === 'string') {
    var types = normalizeType(selector);

    types.forEach(function(type) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.type === type;
        })
      );
    });
  }

  return filteredInstances;
}

function getInstanceById(id) {
  var instance;

  for (var i = 0; i < instances.length; i++) {
    if (instances[i].id === id) {
      instance = instances[i];
      break;
    }
  }
  return instance;
}

function isInstance(selector) {
  return getInstances(selector).length > 0;
}

function normalizeType(types) {
  // If '*' then fetch all registered section types
  if (types === '*') {
    types = Object.keys(registered);

    // If a single section type string is passed, put it in an array
  } else if (typeof types === 'string') {
    types = [types];

    // If single section constructor is passed, transform to array with section
    // type string
  } else if (types.constructor === Section) {
    types = [types.prototype.type];

    // If array of typed section constructors is passed, transform the array to
    // type strings
  } else if (Array.isArray(types) && types[0].constructor === Section) {
    types = types.map(function(TypedSection) {
      return TypedSection.prototype.type;
    });
  }

  types = types.map(function(type) {
    return type.toLowerCase();
  });

  return types;
}

function normalizeContainers(containers) {
  // Nodelist with entries
  if (NodeList.prototype.isPrototypeOf(containers) && containers.length > 0) {
    containers = Array.prototype.slice.call(containers);

    // Empty Nodelist
  } else if (
    NodeList.prototype.isPrototypeOf(containers) &&
    containers.length === 0
  ) {
    containers = [];

    // Handle null (document.querySelector() returns null with no match)
  } else if (containers === null) {
    containers = [];

    // Single DOM element
  } else if (!Array.isArray(containers) && containers instanceof Element) {
    containers = [containers];
  }

  return containers;
}

if (window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );

    if (container !== null) {
      load(container.getAttribute(SECTION_TYPE_ATTR), container);
    }
  });

  document.addEventListener('shopify:section:unload', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );
    var instance = getInstances(container)[0];

    if (typeof instance === 'object') {
      unload(container);
    }
  });

  document.addEventListener('shopify:section:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onSelect(event);
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onDeselect(event);
    }
  });

  document.addEventListener('shopify:block:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockSelect(event);
    }
  });

  document.addEventListener('shopify:block:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockDeselect(event);
    }
  });
}

/*!
 * slide-anim
 * https://github.com/yomotsu/slide-anim
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
var global$1 = window;
var isPromiseSuppoted = typeof global$1.Promise === 'function';
var PromiseLike = isPromiseSuppoted ? global$1.Promise : (function () {
    function PromiseLike(executor) {
        var callback = function () { };
        var resolve = function () {
            callback();
        };
        executor(resolve);
        return {
            then: function (_callback) {
                callback = _callback;
            }
        };
    }
    return PromiseLike;
}());

var pool = [];
var inAnimItems = {
    add: function (el, defaultStyle, timeoutId, onCancelled) {
        var inAnimItem = { el: el, defaultStyle: defaultStyle, timeoutId: timeoutId, onCancelled: onCancelled };
        this.remove(el);
        pool.push(inAnimItem);
    },
    remove: function (el) {
        var index = inAnimItems.findIndex(el);
        if (index === -1)
            return;
        var inAnimItem = pool[index];
        clearTimeout(inAnimItem.timeoutId);
        inAnimItem.onCancelled();
        pool.splice(index, 1);
    },
    find: function (el) {
        return pool[inAnimItems.findIndex(el)];
    },
    findIndex: function (el) {
        var index = -1;
        pool.some(function (item, i) {
            if (item.el === el) {
                index = i;
                return true;
            }
            return false;
        });
        return index;
    }
};

var CSS_EASEOUT_EXPO = 'cubic-bezier( 0.19, 1, 0.22, 1 )';
function slideDown(el, options) {
    if (options === void 0) { options = {}; }
    return new PromiseLike(function (resolve) {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        var _isVisible = isVisible(el);
        var hasEndHeight = typeof options.endHeight === 'number';
        var display = options.display || 'block';
        var duration = options.duration || 400;
        var onCancelled = options.onCancelled || function () { };
        var defaultStyle = el.getAttribute('style') || '';
        var style = window.getComputedStyle(el);
        var defaultStyles = getDefaultStyles(el, display);
        var isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        var contentHeight = defaultStyles.height;
        var minHeight = defaultStyles.minHeight;
        var paddingTop = defaultStyles.paddingTop;
        var paddingBottom = defaultStyles.paddingBottom;
        var borderTop = defaultStyles.borderTop;
        var borderBottom = defaultStyles.borderBottom;
        var cssDuration = duration + "ms";
        var cssEasing = CSS_EASEOUT_EXPO;
        var cssTransition = [
            "height " + cssDuration + " " + cssEasing,
            "min-height " + cssDuration + " " + cssEasing,
            "padding " + cssDuration + " " + cssEasing,
            "border-width " + cssDuration + " " + cssEasing
        ].join();
        var startHeight = _isVisible ? style.height : '0px';
        var startMinHeight = _isVisible ? style.minHeight : '0px';
        var startPaddingTop = _isVisible ? style.paddingTop : '0px';
        var startPaddingBottom = _isVisible ? style.paddingBottom : '0px';
        var startBorderTopWidth = _isVisible ? style.borderTopWidth : '0px';
        var startBorderBottomWidth = _isVisible ? style.borderBottomWidth : '0px';
        var endHeight = (function () {
            if (hasEndHeight)
                return options.endHeight + "px";
            return !isBorderBox ?
                contentHeight - paddingTop - paddingBottom + "px" :
                contentHeight + borderTop + borderBottom + "px";
        })();
        var endMinHeight = minHeight + "px";
        var endPaddingTop = paddingTop + "px";
        var endPaddingBottom = paddingBottom + "px";
        var endBorderTopWidth = borderTop + "px";
        var endBorderBottomWidth = borderBottom + "px";
        if (startHeight === endHeight &&
            startPaddingTop === endPaddingTop &&
            startPaddingBottom === endPaddingBottom &&
            startBorderTopWidth === endBorderTopWidth &&
            startBorderBottomWidth === endBorderBottomWidth) {
            resolve();
            return;
        }
        requestAnimationFrame(function () {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.visibility = 'visible';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(function () {
                el.style.height = endHeight;
                el.style.minHeight = endMinHeight;
                el.style.paddingTop = endPaddingTop;
                el.style.paddingBottom = endPaddingBottom;
                el.style.borderTopWidth = endBorderTopWidth;
                el.style.borderBottomWidth = endBorderBottomWidth;
            });
        });
        var timeoutId = setTimeout(function () {
            resetStyle(el);
            el.style.display = display;
            if (hasEndHeight) {
                el.style.height = options.endHeight + "px";
                el.style.overflow = "hidden";
            }
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideUp(el, options) {
    if (options === void 0) { options = {}; }
    return new PromiseLike(function (resolve) {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        var _isVisible = isVisible(el);
        var display = options.display || 'block';
        var duration = options.duration || 400;
        var onCancelled = options.onCancelled || function () { };
        if (!_isVisible) {
            resolve();
            return;
        }
        var defaultStyle = el.getAttribute('style') || '';
        var style = window.getComputedStyle(el);
        var isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        var minHeight = pxToNumber(style.getPropertyValue('min-height'));
        var paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
        var paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
        var borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
        var borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
        var contentHeight = el.scrollHeight;
        var cssDuration = duration + 'ms';
        var cssEasing = CSS_EASEOUT_EXPO;
        var cssTransition = [
            "height " + cssDuration + " " + cssEasing,
            "padding " + cssDuration + " " + cssEasing,
            "border-width " + cssDuration + " " + cssEasing
        ].join();
        var startHeight = !isBorderBox ?
            contentHeight - paddingTop - paddingBottom + "px" :
            contentHeight + borderTop + borderBottom + "px";
        var startMinHeight = minHeight + "px";
        var startPaddingTop = paddingTop + "px";
        var startPaddingBottom = paddingBottom + "px";
        var startBorderTopWidth = borderTop + "px";
        var startBorderBottomWidth = borderBottom + "px";
        requestAnimationFrame(function () {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(function () {
                el.style.height = '0';
                el.style.minHeight = '0';
                el.style.paddingTop = '0';
                el.style.paddingBottom = '0';
                el.style.borderTopWidth = '0';
                el.style.borderBottomWidth = '0';
            });
        });
        var timeoutId = setTimeout(function () {
            resetStyle(el);
            el.style.display = 'none';
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideStop(el) {
    var elementObject = inAnimItems.find(el);
    if (!elementObject)
        return;
    var style = window.getComputedStyle(el);
    var height = style.height;
    var paddingTop = style.paddingTop;
    var paddingBottom = style.paddingBottom;
    var borderTopWidth = style.borderTopWidth;
    var borderBottomWidth = style.borderBottomWidth;
    resetStyle(el);
    el.style.height = height;
    el.style.paddingTop = paddingTop;
    el.style.paddingBottom = paddingBottom;
    el.style.borderTopWidth = borderTopWidth;
    el.style.borderBottomWidth = borderBottomWidth;
    el.style.overflow = 'hidden';
    inAnimItems.remove(el);
}
function isVisible(el) {
    return el.offsetHeight !== 0;
}
function resetStyle(el) {
    el.style.visibility = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    el.style.overflow = '';
    el.style.transition = '';
    el.style.webkitTransition = '';
}
function getDefaultStyles(el, defaultDisplay) {
    if (defaultDisplay === void 0) { defaultDisplay = 'block'; }
    var defaultStyle = el.getAttribute('style') || '';
    var style = window.getComputedStyle(el);
    el.style.visibility = 'hidden';
    el.style.display = defaultDisplay;
    var width = pxToNumber(style.getPropertyValue('width'));
    el.style.position = 'absolute';
    el.style.width = width + "px";
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    var minHeight = pxToNumber(style.getPropertyValue('min-height'));
    var paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
    var paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
    var borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
    var borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
    var height = el.scrollHeight;
    el.setAttribute('style', defaultStyle);
    return {
        height: height,
        minHeight: minHeight,
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        borderTop: borderTop,
        borderBottom: borderBottom
    };
}
function pxToNumber(px) {
    return +px.replace(/px/, '');
}

function n$3(n,t){return void 0===t&&(t=document),t.querySelector(n)}function t$6(n,t){return void 0===t&&(t=document),[].slice.call(t.querySelectorAll(n))}function c$2(n,t){return Array.isArray(n)?n.forEach(t):t(n)}function r$3(n){return function(t,r,e){return c$2(t,function(t){return t[n+"EventListener"](r,e)})}}function e$3(n,t,c){return r$3("add")(n,t,c),function(){return r$3("remove")(n,t,c)}}function o$2(n){return function(t){var r=arguments;return c$2(t,function(t){var c;return (c=t.classList)[n].apply(c,[].slice.call(r,1))})}}function u$2(n){o$2("add").apply(void 0,[n].concat([].slice.call(arguments,1)));}function i$1(n){o$2("remove").apply(void 0,[n].concat([].slice.call(arguments,1)));}function l(n){o$2("toggle").apply(void 0,[n].concat([].slice.call(arguments,1)));}function a$1(n,t){return n.classList.contains(t)}

var selectors$1m = {
  headings: ".accordion__heading",
  labels: ".accordion__label"
};

var accordion = node => {
  node.classList.add("accordion--active");
  var headings = t$6(selectors$1m.headings, node);
  var labels = t$6(selectors$1m.labels, node);
  headings.forEach(heading => {
    if (!a$1(heading, "type-heading-2")) u$2(heading, "type-heading-2");
  });
  labels.forEach(label => {
    if (!a$1(label, "type-heading-3")) u$2(label, "type-heading-3");
  });
  var events = [];

  var _handleAnimation = e => {
    var {
      parentNode: group,
      nextElementSibling: content
    } = e.currentTarget;
    e.preventDefault();
    slideStop(content);

    if (isVisible(content)) {
      slideUp(content);
      e.currentTarget.setAttribute("aria-expanded", false);
      group.setAttribute("data-open", false);
      content.setAttribute("aria-hidden", true);
    } else {
      slideDown(content);
      e.currentTarget.setAttribute("aria-expanded", true);
      group.setAttribute("data-open", true);
      content.setAttribute("aria-hidden", false);
    }
  };

  labels.forEach(label => {
    if (label.tagName === "A") {
      label.href = "#";
    }

    events.push(e$3(label, "click", e => _handleAnimation(e)));
  });

  var unload = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  return {
    unload
  };
};

var n$2,e$2,i,o$1,t$5,r$2,f,d,p,u$1=[];function w(n,a){return e$2=window.pageXOffset,o$1=window.pageYOffset,r$2=window.innerHeight,d=window.innerWidth,void 0===i&&(i=e$2),void 0===t$5&&(t$5=o$1),void 0===p&&(p=d),void 0===f&&(f=r$2),(a||o$1!==t$5||e$2!==i||r$2!==f||d!==p)&&(!function(n){for(var w=0;w<u$1.length;w++)u$1[w]({x:e$2,y:o$1,px:i,py:t$5,vh:r$2,pvh:f,vw:d,pvw:p},n);}(n),i=e$2,t$5=o$1,f=r$2,p=d),requestAnimationFrame(w)}function srraf(e){return u$1.indexOf(e)<0&&u$1.push(e),n$2=n$2||w(performance.now()),{update:function(){return w(performance.now(),!0),this},destroy:function(){u$1.splice(u$1.indexOf(e),1);}}}

var n$1=function(n){if("object"!=typeof(t=n)||Array.isArray(t))throw "state should be an object";var t;},t$4=function(n,t,e,c){return (r=n,r.reduce(function(n,t,e){return n.indexOf(t)>-1?n:n.concat(t)},[])).reduce(function(n,e){return n.concat(t[e]||[])},[]).map(function(n){return n(e,c)});var r;},e$1=a(),c$1=e$1.on,r$1=e$1.emit,o=e$1.hydrate,u=e$1.getState;function a(e){void 0===e&&(e={});var c={};return {getState:function(){return Object.assign({},e)},hydrate:function(r){return n$1(r),Object.assign(e,r),function(){var n=["*"].concat(Object.keys(r));t$4(n,c,e);}},on:function(n,t){return (n=[].concat(n)).map(function(n){return c[n]=(c[n]||[]).concat(t)}),function(){return n.map(function(n){return c[n].splice(c[n].indexOf(t),1)})}},emit:function(r,o,u){var a=("*"===r?[]:["*"]).concat(r);(o="function"==typeof o?o(e):o)&&(n$1(o),Object.assign(e,o),a=a.concat(Object.keys(o))),t$4(a,c,e,u);}}}

var selectors$1l = {
  headerContainer: ".header-container",
  headerWrapper: "#header",
  utilityBar: ".utility-bar-section",
  logoWrapper: ".header__logo-wrapper"
};

var stickyHeader = node => {
  if (!node) return;
  var root = document.documentElement; // Elements can change when resizing or altering header

  var headerParent = null;
  var headerHeight = null;
  var headerWrapper = null;
  var utilityBar = null;
  var utilityBarHeight = null;
  var headerHasCustomLogoImage = null;
  var initialHeightSet = false;
  var transparentEnabled = null;
  var scroller = null;
  var stickyScroller = null; // Breakpoint is equal to 60em

  var mediumBP = 960;
  var offsetRootVar = "--header-offset-height";
  var initialHeight = "--header-initial-height"; // get elements & element heights

  var _defineElements = () => {
    headerParent = document.querySelector(selectors$1l.headerContainer);
    headerWrapper = node.querySelector(selectors$1l.headerWrapper);
    utilityBar = node.querySelector(selectors$1l.utilityBar);
    utilityBarHeight = utilityBar ? utilityBar.offsetHeight : 0;
    headerHeight = utilityBarHeight + headerWrapper.offsetHeight;
    node.querySelector(selectors$1l.logoWrapper);
    headerHasCustomLogoImage = node.querySelector(".header__logo-image img"); // True if the transparent header is enabled in the theme editor

    transparentEnabled = JSON.parse(headerWrapper.dataset.transparentHeader);
  };

  _defineElements();

  var _screenUnderMediumBP = () => {
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return viewportWidth <= mediumBP;
  };

  var screenUnderMediumBP = _screenUnderMediumBP();

  scroller = srraf(_ref => {
    var {
      vw
    } = _ref;

    _setRootVar("--header-height", utilityBarHeight + headerWrapper.offsetHeight);

    var currentScreenWidthUnderMediumBP = vw <= mediumBP;

    if (currentScreenWidthUnderMediumBP !== screenUnderMediumBP) {
      screenUnderMediumBP = currentScreenWidthUnderMediumBP;

      _setupStickyHeader();
    }
  });

  var _setRootVar = (name, value) => {
    root.style.setProperty(name, "".concat(value, "px"));
  };

  var _setHeaderType = () => {
    // Remove header types incase of customizer changes
    root.classList.remove("header-transparent", "header-sticky");
    root.classList.add(transparentEnabled ? "header-transparent" : "header-sticky");
  };

  var _setupStickyHeader = () => {
    //redifine elements & heights
    _defineElements(); // If the header has a logo image we calculate values after image has loaded


    if (!headerHasCustomLogoImage || headerHasCustomLogoImage && headerHasCustomLogoImage.complete) {
      _processStickyHeader();
    } else {
      headerHasCustomLogoImage.addEventListener("load", _processStickyHeader, {
        once: true
      });
    }
  };

  var _processStickyHeader = () => {
    if (!initialHeightSet) {
      _setRootVar(initialHeight, headerHeight);

      initialHeightSet = true;
    }

    _setRootVar(offsetRootVar, headerHeight);

    _setHeaderType();

    _initStickyHeader(_getStickyOffsets());
  }; // Returns object of offset values


  var _getStickyOffsets = () => {
    var offsets = {};
    offsets.stickyHeaderResetPosition = utilityBarHeight ? 0 : 1; // Set offSets based on size and content of header

    offsets.offsetHeight = utilityBarHeight;
    offsets.scrollYToSticky = utilityBarHeight ? utilityBarHeight : 1;
    return offsets;
  };

  var _initStickyHeader = offsets => {
    var {
      scrollYToSticky,
      offsetHeight,
      stickyHeaderResetPosition
    } = offsets; // Destroy stickyScroller if one already exists

    if (stickyScroller) {
      stickyScroller.destroy();
    } // Init the scroller to monitor for y position to stick/unstick header


    stickyScroller = srraf(_ref2 => {
      var {
        y
      } = _ref2;

      if (!document.body.classList.contains("scroll-lock")) {
        if (y < scrollYToSticky) {
          _toggleStickyHeader(false, headerParent);

          if (utilityBarHeight) {
            _setElementTopPosition(headerParent, stickyHeaderResetPosition);
          }

          _setRootVar(offsetRootVar, headerHeight - y);
        } else if (y >= scrollYToSticky) {
          _toggleStickyHeader(true, headerParent);

          if (utilityBarHeight) {
            _setElementTopPosition(headerParent, -offsetHeight);
          }

          _setRootVar(offsetRootVar, headerHeight);
        }
      }
    });
    stickyScroller.update();
  };

  var _setElementTopPosition = (element, value) => {
    element.style.top = "".concat(value, "px");
  };

  var _toggleStickyHeader = (isSticky, element) => {
    if (isSticky) {
      root.classList.add("header-stuck");
      element.classList.add("is-sticky");
      headerWrapper.classList.remove("header--transparent");
      r$1("sticky-header:stuck");
    } else {
      element.classList.remove("is-sticky");
      root.classList.remove("header-stuck");

      if (transparentEnabled) {
        headerWrapper.classList.add("header--transparent");
      }
    }
  };

  var _reload = () => {
    scroller.update();

    _setupStickyHeader(); // Let pages know the header changed


    r$1("headerChange", () => {});
  };

  c$1("sticky-header:reload", () => {
    _reload();
  });

  _setupStickyHeader();

  var unload = () => {
    if (scroller) {
      scroller.destroy();
    }

    if (stickyScroller) {
      stickyScroller.destroy();
    }
  };

  return {
    unload
  };
};

var events = {
  filters: {
    updated: "filters:updated"
  },
  sort: {
    updated: "sort:updated"
  },
  reviews: {
    added: "reviews:added"
  },
  headerOverlay: {
    show: "headerOverlay:show",
    hide: "headerOverlay:hide",
    hiding: "headerOverlay:hiding"
  },
  drawerOverlay: {
    show: "drawerOverlay:show",
    hide: "drawerOverlay:hide",
    hiding: "drawerOverlay:hiding"
  }
};

var classes$r = {
  visible: "visible"
};

var headerOverlay = node => {
  if (!node) return;
  var overlay = node;
  var overlayShowListener = c$1(events.headerOverlay.show, () => _showOverlay());
  var overlayHideListener = c$1(events.headerOverlay.hide, () => _hideOverlay());

  var _showOverlay = () => {
    o({
      headerOverlayOpen: true
    });
    overlay.classList.add(classes$r.visible);
  };

  var _hideOverlay = () => {
    o({
      headerOverlayOpen: false
    });
    r$1(events.headerOverlay.hiding);
    overlay.classList.remove(classes$r.visible);
  };

  var unload = () => {
    overlayShowListener();
    overlayHideListener();
  };

  return {
    unload
  };
};

var selectors$1k = {
  innerOverlay: ".drawer-overlay__inner"
};
var classes$q = {
  isVisible: "is-visible",
  isActive: "is-active"
};

var drawerOverlay = node => {
  if (!node) return;
  var overlay = node;
  var overlayInner = node.querySelector(selectors$1k.innerOverlay);
  var overlayShowListener = c$1(events.drawerOverlay.show, () => _showOverlay());
  var overlayHideListener = c$1(events.drawerOverlay.hide, () => _hideOverlay());

  var _showOverlay = () => {
    overlay.classList.add(classes$q.isActive);
    setTimeout(() => {
      overlayInner.classList.add(classes$q.isVisible);
    }, 10);
  };

  var _hideOverlay = () => {
    r$1(events.drawerOverlay.hiding);
    overlayInner.classList.remove(classes$q.isVisible);
    setTimeout(() => {
      overlay.classList.remove(classes$q.isActive);
    }, 300);
  };

  overlay.addEventListener("click", _hideOverlay);

  var unload = () => {
    overlayShowListener();
    overlayHideListener();
    overlay.removeEventListener("click", _hideOverlay);
  };

  return {
    unload
  };
};

/*!
* tabbable 5.2.1
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
var candidateSelectors$1 = ['input', 'select', 'textarea', 'a[href]', 'button', '[tabindex]', 'audio[controls]', 'video[controls]', '[contenteditable]:not([contenteditable="false"])', 'details>summary:first-of-type', 'details'];
var candidateSelector$1 = /* #__PURE__ */candidateSelectors$1.join(',');
var matches$1 = typeof Element === 'undefined' ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

var getCandidates = function getCandidates(el, includeContainer, filter) {
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector$1));

  if (includeContainer && matches$1.call(el, candidateSelector$1)) {
    candidates.unshift(el);
  }

  candidates = candidates.filter(filter);
  return candidates;
};

var isContentEditable$1 = function isContentEditable(node) {
  return node.contentEditable === 'true';
};

var getTabindex$1 = function getTabindex(node) {
  var tabindexAttr = parseInt(node.getAttribute('tabindex'), 10);

  if (!isNaN(tabindexAttr)) {
    return tabindexAttr;
  } // Browsers do not return `tabIndex` correctly for contentEditable nodes;
  // so if they don't have a tabindex attribute specifically set, assume it's 0.


  if (isContentEditable$1(node)) {
    return 0;
  } // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
  //  `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
  //  yet they are still part of the regular tab order; in FF, they get a default
  //  `tabIndex` of 0; since Chrome still puts those elements in the regular tab
  //  order, consider their tab index to be 0.


  if ((node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO' || node.nodeName === 'DETAILS') && node.getAttribute('tabindex') === null) {
    return 0;
  }

  return node.tabIndex;
};

var sortOrderedTabbables$1 = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};

var isInput$1 = function isInput(node) {
  return node.tagName === 'INPUT';
};

var isHiddenInput$1 = function isHiddenInput(node) {
  return isInput$1(node) && node.type === 'hidden';
};

var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};

var getCheckedRadio$1 = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};

var isTabbableRadio$1 = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }

  var radioScope = node.form || node.ownerDocument;

  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };

  var radioSet;

  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }

  var checked = getCheckedRadio$1(radioSet, node.form);
  return !checked || checked === node;
};

var isRadio$1 = function isRadio(node) {
  return isInput$1(node) && node.type === 'radio';
};

var isNonTabbableRadio$1 = function isNonTabbableRadio(node) {
  return isRadio$1(node) && !isTabbableRadio$1(node);
};

var isHidden$1 = function isHidden(node, displayCheck) {
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }

  var isDirectSummary = matches$1.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;

  if (matches$1.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  }

  if (!displayCheck || displayCheck === 'full') {
    while (node) {
      if (getComputedStyle(node).display === 'none') {
        return true;
      }

      node = node.parentElement;
    }
  } else if (displayCheck === 'non-zero-area') {
    var _node$getBoundingClie = node.getBoundingClientRect(),
        width = _node$getBoundingClie.width,
        height = _node$getBoundingClie.height;

    return width === 0 && height === 0;
  }

  return false;
}; // form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset


var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (isInput$1(node) || node.tagName === 'SELECT' || node.tagName === 'TEXTAREA' || node.tagName === 'BUTTON') {
    var parentNode = node.parentElement;

    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> as an immediate child of the disabled
        //  <fieldset>: if the node is in that legend, it'll be enabled even
        //  though the fieldset is disabled; otherwise, the node is in a
        //  secondary/subsequent legend, or somewhere else within the fieldset
        //  (however deep nested) and it'll be disabled
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i);

          if (child.tagName === 'LEGEND') {
            if (child.contains(node)) {
              return false;
            } // the node isn't in the first legend (in doc order), so no matter
            //  where it is now, it'll be disabled


            return true;
          }
        } // the node isn't in a legend, so no matter where it is now, it'll be disabled


        return true;
      }

      parentNode = parentNode.parentElement;
    }
  } // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state


  return false;
};

var isNodeMatchingSelectorFocusable$1 = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled || isHiddenInput$1(node) || isHidden$1(node, options.displayCheck) || // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }

  return true;
};

var isNodeMatchingSelectorTabbable$1 = function isNodeMatchingSelectorTabbable(options, node) {
  if (!isNodeMatchingSelectorFocusable$1(options, node) || isNonTabbableRadio$1(node) || getTabindex$1(node) < 0) {
    return false;
  }

  return true;
};

var tabbable$1 = function tabbable(el, options) {
  options = options || {};
  var regularTabbables = [];
  var orderedTabbables = [];
  var candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorTabbable$1.bind(null, options));
  candidates.forEach(function (candidate, i) {
    var candidateTabindex = getTabindex$1(candidate);

    if (candidateTabindex === 0) {
      regularTabbables.push(candidate);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        node: candidate
      });
    }
  });
  var tabbableNodes = orderedTabbables.sort(sortOrderedTabbables$1).map(function (a) {
    return a.node;
  }).concat(regularTabbables);
  return tabbableNodes;
};

var focusable = function focusable(el, options) {
  options = options || {};
  var candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorFocusable$1.bind(null, options));
  return candidates;
};

var isTabbable$1 = function isTabbable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches$1.call(node, candidateSelector$1) === false) {
    return false;
  }

  return isNodeMatchingSelectorTabbable$1(options, node);
};

var focusableCandidateSelector$1 = /* #__PURE__ */candidateSelectors$1.concat('iframe').join(',');

var isFocusable$1 = function isFocusable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches$1.call(node, focusableCandidateSelector$1) === false) {
    return false;
  }

  return isNodeMatchingSelectorFocusable$1(options, node);
};

/*!
* focus-trap 6.7.3
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/

function ownKeys$1(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2$1(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys$1(Object(source), !0).forEach(function (key) {
      _defineProperty$1(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$1(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function _defineProperty$1(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var activeFocusTraps = function () {
  var trapQueue = [];
  return {
    activateTrap: function activateTrap(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];

        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },
    deactivateTrap: function deactivateTrap(trap) {
      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
}();

var isSelectableInput = function isSelectableInput(node) {
  return node.tagName && node.tagName.toLowerCase() === 'input' && typeof node.select === 'function';
};

var isEscapeEvent = function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
};

var isTabEvent = function isTabEvent(e) {
  return e.key === 'Tab' || e.keyCode === 9;
};

var delay = function delay(fn) {
  return setTimeout(fn, 0);
}; // Array.find/findIndex() are not supported on IE; this replicates enough
//  of Array.findIndex() for our needs


var findIndex = function findIndex(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false; // break
    }

    return true; // next
  });
  return idx;
};
/**
 * Get an option's value when it could be a plain value, or a handler that provides
 *  the value.
 * @param {*} value Option's value to check.
 * @param {...*} [params] Any parameters to pass to the handler, if `value` is a function.
 * @returns {*} The `value`, or the handler's returned value.
 */


var valueOrHandler = function valueOrHandler(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }

  return typeof value === 'function' ? value.apply(void 0, params) : value;
};

var getActualTarget = function getActualTarget(event) {
  // NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
  //  shadow host. However, event.target.composedPath() will be an array of
  //  nodes "clicked" from inner-most (the actual element inside the shadow) to
  //  outer-most (the host HTML document). If we have access to composedPath(),
  //  then use its first element; otherwise, fall back to event.target (and
  //  this only works for an _open_ shadow DOM; otherwise,
  //  composedPath()[0] === event.target always).
  return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
};

var createFocusTrap = function createFocusTrap(elements, userOptions) {
  // SSR: a live trap shouldn't be created in this type of environment so this
  //  should be safe code to execute if the `document` option isn't specified
  var doc = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.document) || document;

  var config = _objectSpread2$1({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true
  }, userOptions);

  var state = {
    // @type {Array<HTMLElement>}
    containers: [],
    // list of objects identifying the first and last tabbable nodes in all containers/groups in
    //  the trap
    // NOTE: it's possible that a group has no tabbable nodes if nodes get removed while the trap
    //  is active, but the trap should never get to a state where there isn't at least one group
    //  with at least one tabbable node in it (that would lead to an error condition that would
    //  result in an error being thrown)
    // @type {Array<{
    //   container: HTMLElement,
    //   firstTabbableNode: HTMLElement|null,
    //   lastTabbableNode: HTMLElement|null,
    //   nextTabbableNode: (node: HTMLElement, forward: boolean) => HTMLElement|undefined
    // }>}
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    // timer ID for when delayInitialFocus is true and initial focus in this trap
    //  has been delayed during activation
    delayInitialFocusTimer: undefined
  };
  var trap; // eslint-disable-line prefer-const -- some private functions reference it, and its methods reference private functions, so we must declare here and define later

  var getOption = function getOption(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== undefined ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };

  var containersContain = function containersContain(element) {
    return !!(element && state.containers.some(function (container) {
      return container.contains(element);
    }));
  };
  /**
   * Gets the node for the given option, which is expected to be an option that
   *  can be either a DOM node, a string that is a selector to get a node, `false`
   *  (if a node is explicitly NOT given), or a function that returns any of these
   *  values.
   * @param {string} optionName
   * @returns {undefined | false | HTMLElement | SVGElement} Returns
   *  `undefined` if the option is not specified; `false` if the option
   *  resolved to `false` (node explicitly not given); otherwise, the resolved
   *  DOM node.
   * @throws {Error} If the option is set, not `false`, and is not, or does not
   *  resolve to a node.
   */


  var getNodeForOption = function getNodeForOption(optionName) {
    var optionValue = config[optionName];

    if (typeof optionValue === 'function') {
      for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }

      optionValue = optionValue.apply(void 0, params);
    }

    if (!optionValue) {
      if (optionValue === undefined || optionValue === false) {
        return optionValue;
      } // else, empty string (invalid), null (invalid), 0 (invalid)


      throw new Error("`".concat(optionName, "` was specified but was not a node, or did not return a node"));
    }

    var node = optionValue; // could be HTMLElement, SVGElement, or non-empty string at this point

    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue); // resolve to node, or null if fails

      if (!node) {
        throw new Error("`".concat(optionName, "` as selector refers to no known node"));
      }
    }

    return node;
  };

  var getInitialFocusNode = function getInitialFocusNode() {
    var node = getNodeForOption('initialFocus'); // false explicitly indicates we want no initialFocus at all

    if (node === false) {
      return false;
    }

    if (node === undefined) {
      // option not specified: use fallback options
      if (containersContain(doc.activeElement)) {
        node = doc.activeElement;
      } else {
        var firstTabbableGroup = state.tabbableGroups[0];
        var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode; // NOTE: `fallbackFocus` option function cannot return `false` (not supported)

        node = firstTabbableNode || getNodeForOption('fallbackFocus');
      }
    }

    if (!node) {
      throw new Error('Your focus-trap needs to have at least one focusable element');
    }

    return node;
  };

  var updateTabbableNodes = function updateTabbableNodes() {
    state.tabbableGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable$1(container); // NOTE: if we have tabbable nodes, we must have focusable nodes; focusable nodes
      //  are a superset of tabbable nodes

      var focusableNodes = focusable(container);

      if (tabbableNodes.length > 0) {
        return {
          container: container,
          firstTabbableNode: tabbableNodes[0],
          lastTabbableNode: tabbableNodes[tabbableNodes.length - 1],

          /**
           * Finds the __tabbable__ node that follows the given node in the specified direction,
           *  in this container, if any.
           * @param {HTMLElement} node
           * @param {boolean} [forward] True if going in forward tab order; false if going
           *  in reverse.
           * @returns {HTMLElement|undefined} The next tabbable node, if any.
           */
          nextTabbableNode: function nextTabbableNode(node) {
            var forward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
            // NOTE: If tabindex is positive (in order to manipulate the tab order separate
            //  from the DOM order), this __will not work__ because the list of focusableNodes,
            //  while it contains tabbable nodes, does not sort its nodes in any order other
            //  than DOM order, because it can't: Where would you place focusable (but not
            //  tabbable) nodes in that order? They have no order, because they aren't tabbale...
            // Support for positive tabindex is already broken and hard to manage (possibly
            //  not supportable, TBD), so this isn't going to make things worse than they
            //  already are, and at least makes things better for the majority of cases where
            //  tabindex is either 0/unset or negative.
            // FYI, positive tabindex issue: https://github.com/focus-trap/focus-trap/issues/375
            var nodeIdx = focusableNodes.findIndex(function (n) {
              return n === node;
            });

            if (forward) {
              return focusableNodes.slice(nodeIdx + 1).find(function (n) {
                return isTabbable$1(n);
              });
            }

            return focusableNodes.slice(0, nodeIdx).reverse().find(function (n) {
              return isTabbable$1(n);
            });
          }
        };
      }

      return undefined;
    }).filter(function (group) {
      return !!group;
    }); // remove groups with no tabbable nodes
    // throw if no groups have tabbable nodes and we don't have a fallback focus node either

    if (state.tabbableGroups.length <= 0 && !getNodeForOption('fallbackFocus') // returning false not supported for this option
    ) {
      throw new Error('Your focus-trap must have at least one container with at least one tabbable node in it at all times');
    }
  };

  var tryFocus = function tryFocus(node) {
    if (node === false) {
      return;
    }

    if (node === doc.activeElement) {
      return;
    }

    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus({
      preventScroll: !!config.preventScroll
    });
    state.mostRecentlyFocusedNode = node;

    if (isSelectableInput(node)) {
      node.select();
    }
  };

  var getReturnFocusNode = function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus', previousActiveElement);
    return node ? node : node === false ? false : previousActiveElement;
  }; // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.


  var checkPointerDown = function checkPointerDown(e) {
    var target = getActualTarget(e);

    if (containersContain(target)) {
      // allow the click since it ocurred inside the trap
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      // immediately deactivate the trap
      trap.deactivate({
        // if, on deactivation, we should return focus to the node originally-focused
        //  when the trap was activated (or the configured `setReturnFocus` node),
        //  then assume it's also OK to return focus to the outside node that was
        //  just clicked, causing deactivation, as long as that node is focusable;
        //  if it isn't focusable, then return focus to the original node focused
        //  on activation (or the configured `setReturnFocus` node)
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked, whether it's focusable or not; by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node)
        returnFocus: config.returnFocusOnDeactivate && !isFocusable$1(target)
      });
      return;
    } // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)


    if (valueOrHandler(config.allowOutsideClick, e)) {
      // allow the click outside the trap to take place
      return;
    } // otherwise, prevent the click


    e.preventDefault();
  }; // In case focus escapes the trap for some strange reason, pull it back in.


  var checkFocusIn = function checkFocusIn(e) {
    var target = getActualTarget(e);
    var targetContained = containersContain(target); // In Firefox when you Tab out of an iframe the Document is briefly focused.

    if (targetContained || target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = target;
      }
    } else {
      // escaped! pull it back in to where it just left
      e.stopImmediatePropagation();
      tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
    }
  }; // Hijack Tab events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.


  var checkTab = function checkTab(e) {
    var target = getActualTarget(e);
    updateTabbableNodes();
    var destinationNode = null;

    if (state.tabbableGroups.length > 0) {
      // make sure the target is actually contained in a group
      // NOTE: the target may also be the container itself if it's focusable
      //  with tabIndex='-1' and was given initial focus
      var containerIndex = findIndex(state.tabbableGroups, function (_ref) {
        var container = _ref.container;
        return container.contains(target);
      });
      var containerGroup = containerIndex >= 0 ? state.tabbableGroups[containerIndex] : undefined;

      if (containerIndex < 0) {
        // target not found in any group: quite possible focus has escaped the trap,
        //  so bring it back in to...
        if (e.shiftKey) {
          // ...the last node in the last group
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          // ...the first node in the first group
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (e.shiftKey) {
        // REVERSE
        // is the target the first tabbable node in a group?
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref2) {
          var firstTabbableNode = _ref2.firstTabbableNode;
          return target === firstTabbableNode;
        });

        if (startOfGroupIndex < 0 && (containerGroup.container === target || isFocusable$1(target) && !isTabbable$1(target) && !containerGroup.nextTabbableNode(target, false))) {
          // an exception case where the target is either the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle shift+tab as if focus were on the container's
          //  first tabbable node, and go to the last tabbable node of the LAST group
          startOfGroupIndex = containerIndex;
        }

        if (startOfGroupIndex >= 0) {
          // YES: then shift+tab should go to the last tabbable node in the
          //  previous group (and wrap around to the last tabbable node of
          //  the LAST group if it's the first tabbable node of the FIRST group)
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = destinationGroup.lastTabbableNode;
        }
      } else {
        // FORWARD
        // is the target the last tabbable node in a group?
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var lastTabbableNode = _ref3.lastTabbableNode;
          return target === lastTabbableNode;
        });

        if (lastOfGroupIndex < 0 && (containerGroup.container === target || isFocusable$1(target) && !isTabbable$1(target) && !containerGroup.nextTabbableNode(target))) {
          // an exception case where the target is the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle tab as if focus were on the container's
          //  last tabbable node, and go to the first tabbable node of the FIRST group
          lastOfGroupIndex = containerIndex;
        }

        if (lastOfGroupIndex >= 0) {
          // YES: then tab should go to the first tabbable node in the next
          //  group (and wrap around to the first tabbable node of the FIRST
          //  group if it's the last tabbable node of the LAST group)
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;

          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = _destinationGroup.firstTabbableNode;
        }
      }
    } else {
      // NOTE: the fallbackFocus option does not support returning false to opt-out
      destinationNode = getNodeForOption('fallbackFocus');
    }

    if (destinationNode) {
      e.preventDefault();
      tryFocus(destinationNode);
    } // else, let the browser take care of [shift+]tab and move the focus

  };

  var checkKey = function checkKey(e) {
    if (isEscapeEvent(e) && valueOrHandler(config.escapeDeactivates, e) !== false) {
      e.preventDefault();
      trap.deactivate();
      return;
    }

    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  };

  var checkClick = function checkClick(e) {
    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }

    var target = getActualTarget(e);

    if (containersContain(target)) {
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
  }; //
  // EVENT LISTENERS
  //


  var addListeners = function addListeners() {
    if (!state.active) {
      return;
    } // There can be only one listening focus trap at a time


    activeFocusTraps.activateTrap(trap); // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.

    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };

  var removeListeners = function removeListeners() {
    if (!state.active) {
      return;
    }

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);
    return trap;
  }; //
  // TRAP DEFINITION
  //


  trap = {
    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }

      var onActivate = getOption(activateOptions, 'onActivate');
      var onPostActivate = getOption(activateOptions, 'onPostActivate');
      var checkCanFocusTrap = getOption(activateOptions, 'checkCanFocusTrap');

      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }

      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;

      if (onActivate) {
        onActivate();
      }

      var finishActivation = function finishActivation() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }

        addListeners();

        if (onPostActivate) {
          onPostActivate();
        }
      };

      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }

      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }

      clearTimeout(state.delayInitialFocusTimer); // noop if undefined

      state.delayInitialFocusTimer = undefined;
      removeListeners();
      state.active = false;
      state.paused = false;
      activeFocusTraps.deactivateTrap(trap);
      var onDeactivate = getOption(deactivateOptions, 'onDeactivate');
      var onPostDeactivate = getOption(deactivateOptions, 'onPostDeactivate');
      var checkCanReturnFocus = getOption(deactivateOptions, 'checkCanReturnFocus');

      if (onDeactivate) {
        onDeactivate();
      }

      var returnFocus = getOption(deactivateOptions, 'returnFocus', 'returnFocusOnDeactivate');

      var finishDeactivation = function finishDeactivation() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }

          if (onPostDeactivate) {
            onPostDeactivate();
          }
        });
      };

      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }

      finishDeactivation();
      return this;
    },
    pause: function pause() {
      if (state.paused || !state.active) {
        return this;
      }

      state.paused = true;
      removeListeners();
      return this;
    },
    unpause: function unpause() {
      if (!state.paused || !state.active) {
        return this;
      }

      state.paused = false;
      updateTabbableNodes();
      addListeners();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === 'string' ? doc.querySelector(element) : element;
      });

      if (state.active) {
        updateTabbableNodes();
      }

      return this;
    }
  }; // initialize container elements

  trap.updateContainerElements(elements);
  return trap;
};

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function commonjsRequire (path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var currency_cjs = {};

Object.defineProperty(currency_cjs, "__esModule", {
  value: true
});
var formatMoney_1 = currency_cjs.formatMoney = formatMoney$2;
/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

var moneyFormat = '${{amount}}';

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney$2(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = format || moneyFormat;

  function formatWithDelimiters(number) {
    var precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    var thousands = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ',';
    var decimal = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '.';

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    var parts = number.split('.');
    var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
    var centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

var m={USD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} USD"},EUR:{money_format:"&euro;{{amount}}",money_with_currency_format:"&euro;{{amount}} EUR"},GBP:{money_format:"&pound;{{amount}}",money_with_currency_format:"&pound;{{amount}} GBP"},CAD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} CAD"},ALL:{money_format:"Lek {{amount}}",money_with_currency_format:"Lek {{amount}} ALL"},DZD:{money_format:"DA {{amount}}",money_with_currency_format:"DA {{amount}} DZD"},AOA:{money_format:"Kz{{amount}}",money_with_currency_format:"Kz{{amount}} AOA"},ARS:{money_format:"${{amount_with_comma_separator}}",money_with_currency_format:"${{amount_with_comma_separator}} ARS"},AMD:{money_format:"{{amount}} AMD",money_with_currency_format:"{{amount}} AMD"},AWG:{money_format:"Afl{{amount}}",money_with_currency_format:"Afl{{amount}} AWG"},AUD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} AUD"},BBD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} Bds"},AZN:{money_format:"m.{{amount}}",money_with_currency_format:"m.{{amount}} AZN"},BDT:{money_format:"Tk {{amount}}",money_with_currency_format:"Tk {{amount}} BDT"},BSD:{money_format:"BS${{amount}}",money_with_currency_format:"BS${{amount}} BSD"},BHD:{money_format:"{{amount}}0 BD",money_with_currency_format:"{{amount}}0 BHD"},BYR:{money_format:"Br {{amount}}",money_with_currency_format:"Br {{amount}} BYR"},BZD:{money_format:"BZ${{amount}}",money_with_currency_format:"BZ${{amount}} BZD"},BTN:{money_format:"Nu {{amount}}",money_with_currency_format:"Nu {{amount}} BTN"},BAM:{money_format:"KM {{amount_with_comma_separator}}",money_with_currency_format:"KM {{amount_with_comma_separator}} BAM"},BRL:{money_format:"R$ {{amount_with_comma_separator}}",money_with_currency_format:"R$ {{amount_with_comma_separator}} BRL"},BOB:{money_format:"Bs{{amount_with_comma_separator}}",money_with_currency_format:"Bs{{amount_with_comma_separator}} BOB"},BWP:{money_format:"P{{amount}}",money_with_currency_format:"P{{amount}} BWP"},BND:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} BND"},BGN:{money_format:"{{amount}} лв",money_with_currency_format:"{{amount}} лв BGN"},MMK:{money_format:"K{{amount}}",money_with_currency_format:"K{{amount}} MMK"},KHR:{money_format:"KHR{{amount}}",money_with_currency_format:"KHR{{amount}}"},KYD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} KYD"},XAF:{money_format:"FCFA{{amount}}",money_with_currency_format:"FCFA{{amount}} XAF"},CLP:{money_format:"${{amount_no_decimals}}",money_with_currency_format:"${{amount_no_decimals}} CLP"},CNY:{money_format:"&#165;{{amount}}",money_with_currency_format:"&#165;{{amount}} CNY"},COP:{money_format:"${{amount_with_comma_separator}}",money_with_currency_format:"${{amount_with_comma_separator}} COP"},CRC:{money_format:"&#8353; {{amount_with_comma_separator}}",money_with_currency_format:"&#8353; {{amount_with_comma_separator}} CRC"},HRK:{money_format:"{{amount_with_comma_separator}} kn",money_with_currency_format:"{{amount_with_comma_separator}} kn HRK"},CZK:{money_format:"{{amount_with_comma_separator}} K&#269;",money_with_currency_format:"{{amount_with_comma_separator}} K&#269;"},DKK:{money_format:"{{amount_with_comma_separator}}",money_with_currency_format:"kr.{{amount_with_comma_separator}}"},DOP:{money_format:"RD$ {{amount}}",money_with_currency_format:"RD$ {{amount}}"},XCD:{money_format:"${{amount}}",money_with_currency_format:"EC${{amount}}"},EGP:{money_format:"LE {{amount}}",money_with_currency_format:"LE {{amount}} EGP"},ETB:{money_format:"Br{{amount}}",money_with_currency_format:"Br{{amount}} ETB"},XPF:{money_format:"{{amount_no_decimals_with_comma_separator}} XPF",money_with_currency_format:"{{amount_no_decimals_with_comma_separator}} XPF"},FJD:{money_format:"${{amount}}",money_with_currency_format:"FJ${{amount}}"},GMD:{money_format:"D {{amount}}",money_with_currency_format:"D {{amount}} GMD"},GHS:{money_format:"GH&#8373;{{amount}}",money_with_currency_format:"GH&#8373;{{amount}}"},GTQ:{money_format:"Q{{amount}}",money_with_currency_format:"{{amount}} GTQ"},GYD:{money_format:"G${{amount}}",money_with_currency_format:"${{amount}} GYD"},GEL:{money_format:"{{amount}} GEL",money_with_currency_format:"{{amount}} GEL"},HNL:{money_format:"L {{amount}}",money_with_currency_format:"L {{amount}} HNL"},HKD:{money_format:"${{amount}}",money_with_currency_format:"HK${{amount}}"},HUF:{money_format:"{{amount_no_decimals_with_comma_separator}}",money_with_currency_format:"{{amount_no_decimals_with_comma_separator}} Ft"},ISK:{money_format:"{{amount_no_decimals}} kr",money_with_currency_format:"{{amount_no_decimals}} kr ISK"},INR:{money_format:"Rs. {{amount}}",money_with_currency_format:"Rs. {{amount}}"},IDR:{money_format:"{{amount_with_comma_separator}}",money_with_currency_format:"Rp {{amount_with_comma_separator}}"},ILS:{money_format:"{{amount}} NIS",money_with_currency_format:"{{amount}} NIS"},JMD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} JMD"},JPY:{money_format:"&#165;{{amount_no_decimals}}",money_with_currency_format:"&#165;{{amount_no_decimals}} JPY"},JEP:{money_format:"&pound;{{amount}}",money_with_currency_format:"&pound;{{amount}} JEP"},JOD:{money_format:"{{amount}}0 JD",money_with_currency_format:"{{amount}}0 JOD"},KZT:{money_format:"{{amount}} KZT",money_with_currency_format:"{{amount}} KZT"},KES:{money_format:"KSh{{amount}}",money_with_currency_format:"KSh{{amount}}"},KWD:{money_format:"{{amount}}0 KD",money_with_currency_format:"{{amount}}0 KWD"},KGS:{money_format:"лв{{amount}}",money_with_currency_format:"лв{{amount}}"},LVL:{money_format:"Ls {{amount}}",money_with_currency_format:"Ls {{amount}} LVL"},LBP:{money_format:"L&pound;{{amount}}",money_with_currency_format:"L&pound;{{amount}} LBP"},LTL:{money_format:"{{amount}} Lt",money_with_currency_format:"{{amount}} Lt"},MGA:{money_format:"Ar {{amount}}",money_with_currency_format:"Ar {{amount}} MGA"},MKD:{money_format:"ден {{amount}}",money_with_currency_format:"ден {{amount}} MKD"},MOP:{money_format:"MOP${{amount}}",money_with_currency_format:"MOP${{amount}}"},MVR:{money_format:"Rf{{amount}}",money_with_currency_format:"Rf{{amount}} MRf"},MXN:{money_format:"$ {{amount}}",money_with_currency_format:"$ {{amount}} MXN"},MYR:{money_format:"RM{{amount}} MYR",money_with_currency_format:"RM{{amount}} MYR"},MUR:{money_format:"Rs {{amount}}",money_with_currency_format:"Rs {{amount}} MUR"},MDL:{money_format:"{{amount}} MDL",money_with_currency_format:"{{amount}} MDL"},MAD:{money_format:"{{amount}} dh",money_with_currency_format:"Dh {{amount}} MAD"},MNT:{money_format:"{{amount_no_decimals}} &#8366",money_with_currency_format:"{{amount_no_decimals}} MNT"},MZN:{money_format:"{{amount}} Mt",money_with_currency_format:"Mt {{amount}} MZN"},NAD:{money_format:"N${{amount}}",money_with_currency_format:"N${{amount}} NAD"},NPR:{money_format:"Rs{{amount}}",money_with_currency_format:"Rs{{amount}} NPR"},ANG:{money_format:"&fnof;{{amount}}",money_with_currency_format:"{{amount}} NA&fnof;"},NZD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} NZD"},NIO:{money_format:"C${{amount}}",money_with_currency_format:"C${{amount}} NIO"},NGN:{money_format:"&#8358;{{amount}}",money_with_currency_format:"&#8358;{{amount}} NGN"},NOK:{money_format:"kr {{amount_with_comma_separator}}",money_with_currency_format:"kr {{amount_with_comma_separator}} NOK"},OMR:{money_format:"{{amount_with_comma_separator}} OMR",money_with_currency_format:"{{amount_with_comma_separator}} OMR"},PKR:{money_format:"Rs.{{amount}}",money_with_currency_format:"Rs.{{amount}} PKR"},PGK:{money_format:"K {{amount}}",money_with_currency_format:"K {{amount}} PGK"},PYG:{money_format:"Gs. {{amount_no_decimals_with_comma_separator}}",money_with_currency_format:"Gs. {{amount_no_decimals_with_comma_separator}} PYG"},PEN:{money_format:"S/. {{amount}}",money_with_currency_format:"S/. {{amount}} PEN"},PHP:{money_format:"&#8369;{{amount}}",money_with_currency_format:"&#8369;{{amount}} PHP"},PLN:{money_format:"{{amount_with_comma_separator}} zl",money_with_currency_format:"{{amount_with_comma_separator}} zl PLN"},QAR:{money_format:"QAR {{amount_with_comma_separator}}",money_with_currency_format:"QAR {{amount_with_comma_separator}}"},RON:{money_format:"{{amount_with_comma_separator}} lei",money_with_currency_format:"{{amount_with_comma_separator}} lei RON"},RUB:{money_format:"&#1088;&#1091;&#1073;{{amount_with_comma_separator}}",money_with_currency_format:"&#1088;&#1091;&#1073;{{amount_with_comma_separator}} RUB"},RWF:{money_format:"{{amount_no_decimals}} RF",money_with_currency_format:"{{amount_no_decimals}} RWF"},WST:{money_format:"WS$ {{amount}}",money_with_currency_format:"WS$ {{amount}} WST"},SAR:{money_format:"{{amount}} SR",money_with_currency_format:"{{amount}} SAR"},STD:{money_format:"Db {{amount}}",money_with_currency_format:"Db {{amount}} STD"},RSD:{money_format:"{{amount}} RSD",money_with_currency_format:"{{amount}} RSD"},SCR:{money_format:"Rs {{amount}}",money_with_currency_format:"Rs {{amount}} SCR"},SGD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} SGD"},SYP:{money_format:"S&pound;{{amount}}",money_with_currency_format:"S&pound;{{amount}} SYP"},ZAR:{money_format:"R {{amount}}",money_with_currency_format:"R {{amount}} ZAR"},KRW:{money_format:"&#8361;{{amount_no_decimals}}",money_with_currency_format:"&#8361;{{amount_no_decimals}} KRW"},LKR:{money_format:"Rs {{amount}}",money_with_currency_format:"Rs {{amount}} LKR"},SEK:{money_format:"{{amount_no_decimals}} kr",money_with_currency_format:"{{amount_no_decimals}} kr SEK"},CHF:{money_format:"SFr. {{amount}}",money_with_currency_format:"SFr. {{amount}} CHF"},TWD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} TWD"},THB:{money_format:"{{amount}} &#xe3f;",money_with_currency_format:"{{amount}} &#xe3f; THB"},TZS:{money_format:"{{amount}} TZS",money_with_currency_format:"{{amount}} TZS"},TTD:{money_format:"${{amount}}",money_with_currency_format:"${{amount}} TTD"},TND:{money_format:"{{amount}}",money_with_currency_format:"{{amount}} DT"},TRY:{money_format:"{{amount}}TL",money_with_currency_format:"{{amount}}TL"},UGX:{money_format:"Ush {{amount_no_decimals}}",money_with_currency_format:"Ush {{amount_no_decimals}} UGX"},UAH:{money_format:"₴{{amount}}",money_with_currency_format:"₴{{amount}} UAH"},AED:{money_format:"Dhs. {{amount}}",money_with_currency_format:"Dhs. {{amount}} AED"},UYU:{money_format:"${{amount_with_comma_separator}}",money_with_currency_format:"${{amount_with_comma_separator}} UYU"},VUV:{money_format:"${{amount}}",money_with_currency_format:"${{amount}}VT"},VEF:{money_format:"Bs. {{amount_with_comma_separator}}",money_with_currency_format:"Bs. {{amount_with_comma_separator}} VEF"},VND:{money_format:"{{amount_no_decimals_with_comma_separator}}&#8363;",money_with_currency_format:"{{amount_no_decimals_with_comma_separator}} VND"},XBT:{money_format:"{{amount_no_decimals}} BTC",money_with_currency_format:"{{amount_no_decimals}} BTC"},XOF:{money_format:"CFA{{amount}}",money_with_currency_format:"CFA{{amount}} XOF"},ZMW:{money_format:"K{{amount_no_decimals_with_comma_separator}}",money_with_currency_format:"ZMW{{amount_no_decimals_with_comma_separator}}"}},t$3=function(o){return o.toLowerCase().split("").map(function(o,m){return 0===m?o.toUpperCase():o}).join("")};function c(n){void 0===n&&(n={});var a=Object.assign({},{format:"money_with_currency_format",formats:{},storageKey:"shopify-currency"},n);a.formats=Object.assign({},m,a.formats);var r,_=(void 0===(r=a.storageKey)&&(r="currency"),{key:r,read:function(){return localStorage.getItem(r)},write:function(o){localStorage.setItem(r,o);},remove:function(){localStorage.removeItem(r);}});function e(o){_.write(o);}return {getCurrent:function(){return _.read()},setCurrent:e,convertAll:function(m,n,r,_){if(void 0===_&&(_=a.format),"undefined"==typeof Currency)throw new Error("Can't access Shopify Currency library. Make sure it's properly loaded.");n&&((r||document.querySelectorAll("span.money")).forEach(function(r){if(r.dataset.current!==n){if(Boolean(r.dataset["currency"+t$3(n)]))return r.innerHTML=r.dataset["currency"+t$3(n)],void(r.dataset.currency=n);var e,u=a.formats[m][_]||"{{amount}}",y=a.formats[n][_]||"{{amount}}",c=function(o){return Currency.convert(o,m,n)},f=parseInt(r.innerHTML.replace(/[^0-9]/g,""),10);e=-1!==u.indexOf("amount_no_decimals")?c(100*f):["JOD","KWD","BHD"].includes(m)?c(f/10):c(f);var i=formatMoney_1(e,y);r.innerHTML=i,r.dataset.currency=n,r.setAttribute("data-currency-"+n,i);}}),e(n));}}}

c(typeof currencyOpts !== "undefined" ? currencyOpts : {});
var formatMoney$1 = val => formatMoney_1(val, theme.moneyFormat || "${{amount}}");

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};

  var target = _objectWithoutPropertiesLoose(source, excluded);

  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

/**
 * Image Helper Functions
 * -----------------------------------------------------------------------------
 * A collection of functions that help with basic image operations.
 *
 */
/**
 * Find the Shopify image attribute size
 *
 * @param {string} src
 * @returns {null}
 */

function imageSize(src) {
  /* eslint-disable */
  var match = src.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);
  /* esling-enable */

  if (match) {
    return match[1];
  } else {
    return null;
  }
}
/**
 * Adds a Shopify size attribute to a URL
 *
 * @param src
 * @param size
 * @returns {*}
 */

function getSizedImageUrl(src, size) {
  if (size === null) {
    return src;
  }

  if (size === "master") {
    return removeProtocol(src);
  }

  var match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif|webp)(\?v=\d+)?$/i);

  if (match) {
    var prefix = src.split(match[0]);
    var suffix = match[0];
    return removeProtocol(prefix[0] + "_" + size + suffix);
  } else {
    return null;
  }
}
function removeProtocol(path) {
  return path.replace(/http(s)?:/, "");
}
function onImagesLoaded(container, event) {
  var images = container.getElementsByTagName("img");
  var imageCount = images.length;
  var imagesLoaded = 0;

  for (var i = 0; i < imageCount; i++) {
    images[i].onload = function () {
      imagesLoaded++;

      if (imagesLoaded === imageCount) {
        event();
      }
    };
  }
}

function quantityInput (quantitySelector, container) {
  var quantityWrapper;

  if (container) {
    quantityWrapper = container.querySelector(quantitySelector);
  } else {
    quantityWrapper = this.container.querySelector(quantitySelector);
  }

  var quantityInput = quantityWrapper.querySelector("[data-quantity-input]");
  var addQuantity = quantityWrapper.querySelector(".product-form__quantity-add-item");
  var subtractQuanity = quantityWrapper.querySelector(".product-form__quantity-subtract-item");

  var handleAddQuantity = () => {
    var currentValue = parseInt(quantityInput.value);
    var newValue = currentValue + 1;
    quantityInput.value = addLeadingZero(newValue);
    quantityInput.dispatchEvent(new Event("change"));
  };

  var handleSubtractQuantity = () => {
    var currentValue = parseInt(quantityInput.value);
    if (currentValue === 1) return;
    var newValue = currentValue - 1;
    quantityInput.value = addLeadingZero(newValue);
    quantityInput.dispatchEvent(new Event("change"));
  };

  var addLeadingZero = number => {
    var s = number + "";

    if (s.length < 2) {
      s = "0" + s;
    }

    return s;
  };

  addQuantity.addEventListener("click", handleAddQuantity);
  subtractQuanity.addEventListener("click", handleSubtractQuantity);
  return () => {
    addQuantity.removeEventListener("click", handleAddQuantity);
    subtractQuanity.removeEventListener("click", handleSubtractQuantity);
  };
}

var selectors$1j = {
  product: {
    addButton: "[data-add-to-cart]",
    addButtonQuickShop: "[data-add-button]",
    addButtonText: "[data-add-to-cart-text]",
    comparePrice: "[data-compare-price]",
    comparePriceText: "[data-compare-text]",
    form: "[data-product-form]",
    imageById: id => "[data-image-id='".concat(id, "']"),
    imageWrapper: "[data-product-image-wrapper]",
    optionById: id => "[value='".concat(id, "']"),
    price: "[data-product-price]",
    thumb: "[data-product-single-thumbnail]",
    thumbById: id => "[data-thumbnail-id='".concat(id, "']"),
    thumbs: "[data-product-thumbnails]",
    variantSelect: "[data-variant-select]",
    zoom: "[data-product-zoom]",
    storeAvailability: "[data-store-availability-container]"
  },
  a11y: {
    formStatus: ".form-status"
  }
};

function updateBuyButton (node, variant) {
  var btn = node.querySelector(selectors$1j.product.addButton);
  var text = btn.querySelector(selectors$1j.product.addButtonText);
  var {
    langAvailable,
    langSoldOut,
    langUnavailable
  } = btn.dataset;

  if (!variant) {
    btn.setAttribute("disabled", "disabled");
    text.textContent = langUnavailable;
  } else if (variant.available) {
    btn.removeAttribute("disabled");
    text.textContent = langAvailable;
  } else {
    btn.setAttribute("disabled", "disabled");
    text.textContent = langSoldOut;
  }
}

theme;

function fetch$1(e,n){return n=n||{},new Promise(function(t,r){var s=new XMLHttpRequest,o=[],u=[],i={},a=function(){return {ok:2==(s.status/100|0),statusText:s.statusText,status:s.status,url:s.responseURL,text:function(){return Promise.resolve(s.responseText)},json:function(){return Promise.resolve(s.responseText).then(JSON.parse)},blob:function(){return Promise.resolve(new Blob([s.response]))},clone:a,headers:{keys:function(){return o},entries:function(){return u},get:function(e){return i[e.toLowerCase()]},has:function(e){return e.toLowerCase()in i}}}};for(var l in s.open(n.method||"get",e,!0),s.onload=function(){s.getAllResponseHeaders().replace(/^(.*?):[^\S\n]*([\s\S]*?)$/gm,function(e,n,t){o.push(n=n.toLowerCase()),u.push([n,t]),i[n]=i[n]?i[n]+","+t:t;}),t(a());},s.onerror=r,s.withCredentials="include"==n.credentials,n.headers)s.setRequestHeader(l,n.headers[l]);s.send(n.body||null);})}

var CustomEvents = {
  cartItemAdded: "flu:cart:item-added",
  cartUpdated: "flu:cart:updated",
  cartError: "flu:cart:error",
  productVariantChange: "flu:product:variant-change",
  productQuanityUpdate: "flu:product:quantity-update",
  quickCartOpen: "flu:quick-cart:open",
  quickCartClose: "flu:quick-cart:close",
  // For use with apps. No need to use `flu:`
  quickViewLoaded: "quickview:loaded"
};

var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var detail = {
    detail: data
  };
  var event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

var ls$2 = {
  get: () => JSON.parse(localStorage.getItem("cartItemOrder")),
  set: val => localStorage.setItem("cartItemOrder", val)
};
function updateAddon(id, quantity) {
  return fetchCart().then(_ref2 => {
    var {
      items
    } = _ref2;

    for (var i = 0; i < items.length; i++) {
      if (items[i].variant_id === parseInt(id)) {
        return changeAddon(i + 1, quantity); // shopify cart is a 1-based index
      }
    }
  });
}
function removeAddon(id) {
  if (localStorageAvailable$1() && ls$2.get()) {
    removeItemFromLocalOrder(id);
  }

  return updateAddon(id, 0);
}

function changeAddon(line, quantity) {
  r$1("cart:updating");
  return fetch$1("".concat(theme.routes.cart.change, ".js"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      line,
      quantity
    })
  }).then(res => res.json()).then(cart => {
    if (localStorageAvailable$1() && ls$2.get()) {
      cart.items = reorderCartItems(cart.items, ls$2.get());
    }

    o({
      cart: cart
    });
    r$1("cart:updated", {
      cart: cart
    });
    dispatchCustomEvent(CustomEvents.cartUpdated, {
      cart: cart
    });
    return cart;
  });
}

function cartUpdatedExternally() {
  r$1("cart:updating");
  return fetch$1("".concat(theme.routes.cart.base, ".js"), {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  }).then(res => res.json()).then(cart => {
    if (localStorageAvailable$1() && ls$2.get()) {
      cart.items = reorderCartItems(cart.items, ls$2.get());
    }

    o({
      cart: cart
    });
    r$1("cart:updated", {
      cart: cart
    });
    dispatchCustomEvent(CustomEvents.cartUpdated, {
      cart: cart
    });
    return cart;
  });
}
function getCart() {
  return fetch$1("".concat(theme.routes.cart.base, ".js"), {
    method: "GET",
    credentials: "include"
  }).then(res => res.json()).then(data => {
    if (localStorageAvailable$1() && ls$2.get()) {
      data.items = reorderCartItems(data.items, ls$2.get());
    }

    return data;
  });
}
function addItem(form) {
  r$1("cart:updating");
  return fetch$1("".concat(theme.routes.cart.add, ".js"), {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest"
    },
    body: serialize(form)
  }).then(r => r.json()).then(item => {
    if (item.status == "422") {
      var errorMessage = {
        code: 422,
        message: item.description
      };
      dispatchCustomEvent(CustomEvents.cartError, {
        errorMessage: item.description
      });
      throw errorMessage;
    }

    return fetchCart(item.id).then(cart => {
      o({
        cart: cart
      });
      dispatchCustomEvent(CustomEvents.cartItemAdded, {
        product: item
      });
      r$1("cart:updated");
      return {
        item,
        cart
      };
    });
  });
}
function fetchCart(newestProductId) {
  return fetch$1("".concat(theme.routes.cart.base, ".js"), {
    method: "GET",
    credentials: "include"
  }).then(res => res.json()).then(cart => {
    if (localStorageAvailable$1()) {
      var cartOrder = cart.items.map(e => e.id); // Set the initial cart order if one does not exist in storage

      if (!ls$2.get()) {
        ls$2.set(JSON.stringify(cartOrder));
      }

      if (newestProductId) {
        var indexOfNewProduct = cartOrder.indexOf(newestProductId); // Place newest product at the front of the cart order

        cartOrder.unshift(cartOrder.splice(indexOfNewProduct, 1)[0]);
        ls$2.set(JSON.stringify(cartOrder)); // Let the cart know there is a new product at the front of the order

        o({
          newItemInCart: true
        });
      }

      cart.items = reorderCartItems(cart.items, cartOrder);
    }

    return cart;
  });
} // Match the cart order with the order determined in local storage

function reorderCartItems(items, sortOrder) {
  return items.sort(function (a, b) {
    return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id);
  });
}

function removeItemFromLocalOrder(id) {
  var cartOrder = ls$2.get();
  var indexOfProduct = cartOrder.indexOf(id);
  cartOrder.splice(indexOfProduct, 1);
  ls$2.set(JSON.stringify(cartOrder));
} // See if user has local storage enabled


function localStorageAvailable$1() {
  var test = "test";

  try {
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
/*!
 * Serialize all form data into a SearchParams string
 * (c) 2020 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Node}   form The form to serialize
 * @return {String}      The serialized form data
 */


function serialize(form) {
  var arr = [];
  Array.prototype.slice.call(form.elements).forEach(function (field) {
    if (!field.name || field.disabled || ["file", "reset", "submit", "button"].indexOf(field.type) > -1) return;

    if (field.type === "select-multiple") {
      Array.prototype.slice.call(field.options).forEach(function (option) {
        if (!option.selected) return;
        arr.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(option.value));
      });
      return;
    }

    if (["checkbox", "radio"].indexOf(field.type) > -1 && !field.checked) return;
    arr.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value));
  });
  return arr.join("&");
}

var formatMoney = (val => formatMoney_1(val, window.theme.moneyFormat || "${{amount}}"));

// Fetch the product data from the .js endpoint because it includes
// more data than the .json endpoint.
var getProduct = (handle => cb => fetch("".concat(window.theme.routes.products, "/").concat(handle, ".js")).then(res => res.json()).then(data => cb(data)).catch(err => console.log(err.message)));

var {
  strings: {
    products: strings$5
  }
} = theme;
var selectors$1i = {
  unitPriceContainer: "[data-unit-price-container]",
  unitPrice: "[data-unit-price]",
  unitPriceBase: "[data-unit-base]"
};
var classes$p = {
  available: "unit-price--available"
};

var updateUnitPrices = (container, variant) => {
  var unitPriceContainers = t$6(selectors$1i.unitPriceContainer, container);
  var unitPrices = t$6(selectors$1i.unitPrice, container);
  var unitPriceBases = t$6(selectors$1i.unitPriceBase, container);
  l(unitPriceContainers, classes$p.available, variant.unit_price !== undefined);
  if (!variant.unit_price) return;

  _replaceText(unitPrices, formatMoney(variant.unit_price));

  _replaceText(unitPriceBases, _getBaseUnit(variant.unit_price_measurement));
};

var renderUnitPrice = (unitPrice, unitPriceMeasurement) => {
  if (unitPrice && unitPriceMeasurement) {
    var label = strings$5.product.unitPrice;
    return "\n      <div class=\"unit-price ".concat(classes$p.available, "\">\n        <dt>\n          <span class=\"visually-hidden visually-hidden--inline\">").concat(label, "</span>\n        </dt>\n        <dd class=\"unit-price__price\">\n          <span data-unit-price>").concat(formatMoney(unitPrice), "</span><span aria-hidden=\"true\">/</span><span class=\"visually-hidden\">").concat(strings$5.product.unitPriceSeparator, "&nbsp;</span><span data-unit-base>").concat(_getBaseUnit(unitPriceMeasurement), "</span>\n        </dd>\n      </div>\n    ");
  } else {
    return "";
  }
};

var _getBaseUnit = unitPriceMeasurement => {
  return unitPriceMeasurement.reference_value === 1 ? unitPriceMeasurement.reference_unit : unitPriceMeasurement.reference_value + unitPriceMeasurement.reference_unit;
};

var _replaceText = (nodeList, replacementText) => {
  nodeList.forEach(node => node.innerText = replacementText);
};

var selectors$1h = {
  imageById: id => "[data-media-id='".concat(id, "']"),
  imageWrapper: "[data-product-media-wrapper]",
  inYourSpace: "[data-in-your-space]"
};
var classes$o = {
  hidden: "hidden"
};
function switchImage (container, imageId) {
  var newImage = n$3(selectors$1h.imageWrapper + selectors$1h.imageById(imageId), container);
  var newImageMedia = n$3(".media", newImage);
  var otherImages = t$6("".concat(selectors$1h.imageWrapper, ":not(").concat(selectors$1h.imageById(imageId), ")"), container);
  i$1(newImage, classes$o.hidden); // Update view in space button

  var inYourSpaceButton = n$3(selectors$1h.inYourSpace, container);

  if (inYourSpaceButton) {
    if (newImageMedia.dataset.mediaType === "model") {
      inYourSpaceButton.setAttribute("data-shopify-model3d-id", newImageMedia.dataset.mediaId);
    }
  }

  otherImages.forEach(image => u$2(image, classes$o.hidden));
}

function OptionButtons(els) {
  var groups = els.map(createOptionGroup);

  function destroy() {
    groups && groups.forEach(group => group());
  }

  return {
    groups,
    destroy
  };
}

function createOptionGroup(el) {
  var select = n$3("select", el);
  var buttons = t$6("[data-button]", el);
  var buttonClick = e$3(buttons, "click", e => {
    e.preventDefault();
    var {
      button
    } = e.currentTarget.dataset;
    buttons.forEach(btn => l(btn, "selected", btn.dataset.button === button));
    var opt = n$3("[data-value-handle=\"".concat(button, "\"]"), select);
    opt.selected = true; // const chip = e.target;
    // const selectedLabel = qs('.product-form__selected-label', el);
    // selectedLabel.innerText = chip.dataset.button;

    select.dispatchEvent(new Event("change"));
  });
  return () => buttonClick();
}

var selectors$1g = {
  counterContainer: "[data-inventory-counter]",
  inventoryMessage: ".inventory-counter__message",
  countdownBar: ".inventory-counter__bar",
  progressBar: ".inventory-counter__bar-progress"
};
var classes$n = {
  active: "active",
  inventoryLow: "inventory--low"
};

var inventoryCounter = (container, config) => {
  var variantsInventories = config.variantsInventories;
  var counterContainer = n$3(selectors$1g.counterContainer, container);
  var inventoryMessageElement = n$3(selectors$1g.inventoryMessage, container);
  var progressBar = n$3(selectors$1g.progressBar, container);
  var {
    lowInventoryThreshold,
    showUntrackedQuantity,
    stockCountdownMax,
    unavailableText
  } = counterContainer.dataset; // If the threshold or countdownmax contains anything but numbers abort

  if (!lowInventoryThreshold.match(/^[0-9]+$/) || !stockCountdownMax.match(/^[0-9]+$/)) {
    return;
  }

  var threshold = parseInt(lowInventoryThreshold, 10);
  var countDownMax = parseInt(stockCountdownMax, 10);
  l(counterContainer, classes$n.active, productIventoryValid(variantsInventories[config.id]));
  checkThreshold(variantsInventories[config.id]);
  setProgressBar(variantsInventories[config.id].inventory_quantity, variantsInventories[config.id].inventory_management);
  setInventoryMessage(variantsInventories[config.id].inventory_message);

  function checkThreshold(_ref) {
    var {
      inventory_policy,
      inventory_quantity,
      inventory_management
    } = _ref;
    i$1(counterContainer, classes$n.inventoryLow);

    if (inventory_management !== null) {
      if (inventory_quantity <= threshold) {
        counterContainer.setAttribute("data-stock-category", "low");
        u$2(counterContainer, classes$n.inventoryLow);
      } else {
        counterContainer.setAttribute("data-stock-category", "sufficient");
      }
    } else if (inventory_management === null && showUntrackedQuantity == "true") {
      counterContainer.setAttribute("data-stock-category", "sufficient");
    }
  }

  function setProgressBar(inventoryQuantity, inventoryManagement) {
    if (inventoryManagement === null && showUntrackedQuantity == "true") {
      progressBar.style.width = "".concat(100, "%");
      return;
    }

    if (inventoryQuantity <= 0) {
      progressBar.style.width = "".concat(0, "%");
      return;
    }

    var progressValue = inventoryQuantity < countDownMax ? inventoryQuantity / countDownMax * 100 : 100;
    progressBar.style.width = "calc(".concat(progressValue, "% + 2px)");
  }

  function setInventoryMessage(message) {
    inventoryMessageElement.innerText = message;
  }

  function productIventoryValid(product) {
    return product.inventory_message && (product.inventory_management !== null || product.inventory_management === null && showUntrackedQuantity == "true");
  }

  var update = variant => {
    if (!variant) {
      setUnavailable();
      return;
    }

    l(counterContainer, classes$n.active, productIventoryValid(variantsInventories[variant.id]));
    if (!variant) return;
    checkThreshold(variantsInventories[variant.id]);
    setProgressBar(variantsInventories[variant.id].inventory_quantity, variantsInventories[variant.id].inventory_management);
    setInventoryMessage(variantsInventories[variant.id].inventory_message);
  };

  function setUnavailable() {
    u$2(counterContainer, classes$n.active);
    counterContainer.setAttribute("data-stock-category", "unavailable");
    setProgressBar(0);
    setInventoryMessage(unavailableText);
  }

  return {
    update
  };
};

var selectors$1f = {
  productSku: "[data-product-sku]"
};
var {
  strings: {
    products: strings$4
  }
} = window.theme;
function updateSku (container, variant) {
  var skuElement = n$3(selectors$1f.productSku, container);
  if (!skuElement) return;
  var {
    sku
  } = strings$4.product;

  var skuString = value => "".concat(sku, ": ").concat(value);

  if (!variant || !variant.sku) {
    skuElement.innerText = "";
    return;
  }

  skuElement.innerText = skuString(variant.sku);
}

var classes$m = {
  disabled: "disabled"
};
var selectors$1e = {
  variantsWrapper: "[data-product-variants]",
  variantsJson: "[data-variant-json]",
  input: "[dynamic-variant-input]",
  inputWrap: "[dynamic-variant-input-wrap]",
  inputWrapWithValue: option => "".concat(selectors$1e.inputWrap, "[data-index=\"").concat(option, "\"]"),
  buttonWrap: "[dynamic-variant-button]",
  buttonWrapWithValue: value => "".concat(selectors$1e.buttonWrap, "[data-option-value=\"").concat(value, "\"]")
};
/**
 *  VariantAvailability
    - Cross out sold out or unavailable variants
    - Required markup:
      - class=dynamic-variant-input-wrap + data-index="option{{ forloop.index }}" to wrap select or button group
      - class=dynamic-variant-input + data-index="option{{ forloop.index }}" to wrap selects associated with variant potentially hidden if swatch / chip
      - class=dynamic-variant-button + data-option-value="{{ value | escape }}" to wrap button of swatch / chip
      - hidden product variants json markup
  * @param {node} container product container element
  * @returns {unload} remove event listeners
 */

function variantAvailability (container) {
  var variantsWrapper = n$3(selectors$1e.variantsWrapper, container); // Variant options block do not exist

  if (!variantsWrapper) return;
  var {
    enableDynamicProductOptions,
    currentVariantId
  } = variantsWrapper.dataset;
  if (enableDynamicProductOptions === "false") return;
  var productVariants = JSON.parse(n$3(selectors$1e.variantsJson, container).innerText); // Using associated selects as buy buttons may be disabled.

  var variantSelectors = t$6(selectors$1e.input, container);
  var variantSelectorWrappers = t$6(selectors$1e.inputWrap, container);
  var events = [];
  init();

  function init() {
    variantSelectors.forEach(el => {
      events.push(e$3(el, "change", handleChange));
    });
    setInitialAvailability();
  }

  function setInitialAvailability() {
    // Disable all options on initial load
    variantSelectorWrappers.forEach(group => disableVariantGroup(group));
    var initiallySelectedVariant = productVariants.find(variant => variant.id === parseInt(currentVariantId, 10));
    var currentlySelectedValues = initiallySelectedVariant.options.map((value, index) => {
      return {
        value,
        index: "option".concat(index + 1)
      };
    });
    var initialOptions = createAvailableOptionsTree(productVariants, currentlySelectedValues);

    for (var [option, values] of Object.entries(initialOptions)) {
      manageOptionState(option, values);
    }
  } // Create a list of all options. If any variant exists and is in stock with that option, it's considered available


  function createAvailableOptionsTree(variants, currentlySelectedValues) {
    // Reduce variant array into option availability tree
    return variants.reduce((options, variant) => {
      // Check each option group (e.g. option1, option2, option3) of the variant
      Object.keys(options).forEach(index => {
        if (variant[index] === null) return;
        var entry = options[index].find(option => option.value === variant[index]);

        if (typeof entry === "undefined") {
          // If option has yet to be added to the options tree, add it
          entry = {
            value: variant[index],
            soldOut: true
          };
          options[index].push(entry);
        }

        var currentOption1 = currentlySelectedValues.find(_ref => {
          var {
            index
          } = _ref;
          return index === "option1";
        });
        var currentOption2 = currentlySelectedValues.find(_ref2 => {
          var {
            index
          } = _ref2;
          return index === "option2";
        });

        switch (index) {
          case "option1":
            // Option1 inputs should always remain enabled based on all available variants
            entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            break;

          case "option2":
            // Option2 inputs should remain enabled based on available variants that match first option group
            if (currentOption1 && variant.option1 === currentOption1.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }

            break;

          case "option3":
            // Option 3 inputs should remain enabled based on available variants that match first and second option group
            if (currentOption1 && variant.option1 === currentOption1.value && currentOption2 && variant.option2 === currentOption2.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }

        }
      });
      return options;
    }, {
      option1: [],
      option2: [],
      option3: []
    });
  }

  function handleChange() {
    var currentlySelectedValues = variantSelectors.map(el => {
      return {
        value: el.value,
        index: el.id
      };
    });
    setAvailability(currentlySelectedValues);
  }

  function setAvailability(selectedValues) {
    // Object to hold all options by value.
    // This will be what sets a button/dropdown as
    // sold out or unavailable (not a combo set as purchasable)
    var valuesToManage = createAvailableOptionsTree(productVariants, selectedValues); // Loop through all option levels and send each
    // value w/ args to function that determines to show/hide/enable/disable

    for (var [option, values] of Object.entries(valuesToManage)) {
      manageOptionState(option, values);
    }
  }

  function manageOptionState(option, values) {
    var group = n$3(selectors$1e.inputWrapWithValue(option), container); // Loop through each option value

    values.forEach(obj => {
      toggleVariantOption(group, obj);
    });
  }

  function toggleVariantOption(group, obj) {
    // Selecting by value so escape it
    var value = escapeQuotes(obj.value); // Do nothing if the option is a select dropdown

    if (a$1(group, "product-form__option-select-wrapper")) return;
    var button = n$3(selectors$1e.buttonWrapWithValue(value), group); // Variant exists - enable & show variant

    i$1(button, classes$m.disabled); // Variant sold out - cross out option (remains selectable)

    if (obj.soldOut) {
      u$2(button, classes$m.disabled);
    }
  }

  function disableVariantGroup(group) {
    if (a$1(group, "product-form__option-select-wrapper")) return;
    t$6(selectors$1e.buttonWrap, group).forEach(button => u$2(button, classes$m.disabled));
  }

  function escapeQuotes(str) {
    var escapeMap = {
      '"': '\\"',
      "'": "\\'"
    };
    return str.replace(/"|'/g, m => escapeMap[m]);
  }

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
}

var bp = {
  isSmall: () => window.matchMedia("(max-width: 38em)").matches,
  isLarge: () => window.matchMedia("(min-width: 60em)").matches
};

var classes$l = {
  fullHeight: "section--full-height"
};
var mobileSizes = {
  default: 40,
  noPadding: 10
};
var desktopSizes = {
  default: 80,
  noPadding: 10
};
var intersectionWatcher = (function (node) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    instant: false
  };
  var threshold = 0;

  if (!options.instant) {
    // Get section size, this determines how much margin the section has
    var sectionSize = "default";

    if (a$1(node, classes$l.fullHeight)) {
      sectionSize = "noPadding";
    }

    var margin = 80;

    if (bp.isLarge()) {
      margin = desktopSizes[sectionSize];
    } else {
      margin = mobileSizes[sectionSize];
    }

    threshold = Math.min(margin / node.offsetHeight, 0.5);
  }

  var observer = new IntersectionObserver(_ref => {
    var [{
      isIntersecting: visible
    }] = _ref;

    if (visible) {
      u$2(node, "is-visible");

      if (typeof options.cb === "function") {
        options.cb();
      }

      observer.disconnect();
    }
  }, {
    threshold: threshold
  });
  observer.observe(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.disconnect();
    }

  };
});

/**
 * delayOffset takes an array of selectors and sets the `--delay-offset-multiplier` variable in the correct order
 * @param {node} element The section element
 * @param {items} array Array of animation items
 * @param {offsetStart} number Starting offset index
 * @param {reverse} boolean Reverse thedelay order
 */

var delayOffset = (function (node, items) {
  var offsetStart = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var reverse = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
  var delayOffset = offsetStart;
  items.forEach(selector => {
    var items = t$6(selector, node);

    if (reverse) {
      items = [...items].reverse();
    }

    items.forEach(item => {
      item.style.setProperty("--delay-offset-multiplier", delayOffset);
      delayOffset++;
    });
  });
});

var shouldAnimate = (node => {
  return a$1(node, "animation") && !a$1(document.documentElement, "prefers-reduced-motion");
});

var selectors$1d = {
  sectionBlockItems: ".animation--section-introduction > *",
  slide: ".carousel__slide"
};
var animateCarousel = (node => {
  if (!shouldAnimate(node)) return;
  var offsetSelectors = [selectors$1d.sectionBlockItems, selectors$1d.slide]; // Last slide wraps and peaks at the start of the list
  // if there are 2 more slides than columns.
  // Start the animation with the last slide

  if (a$1(node, "carousel--columns-wrap-around")) {
    offsetSelectors = [selectors$1d.sectionBlockItems, "".concat(selectors$1d.slide, ":last-of-type"), "".concat(selectors$1d.slide, ":not(:last-of-type)")];
  }

  delayOffset(node, offsetSelectors);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$1c = {
  sectionIntro: ".animation--section-introduction > *"
};
var animateSectionIntroduction = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$1c.sectionIntro]);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$1b = {
  animationItem: ".drawer-menu__contents, .drawer-menu__footer"
};
var animateDrawerMenu = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$1b.animationItem]);
});

var selectors$1a = {
  animationItems: ".quick-cart__items > *, .quick-cart__footer"
};
var classes$k = {
  animationRevealed: "animation--revealed"
};
var animateCartDrawer = (node => {
  if (!shouldAnimate(node)) return;
  setup(); // Setup delay offsets

  function setup() {
    delayOffset(node, [selectors$1a.animationItems], 1);
  } // Trigger the reveal animation when the drawer is opened


  function open() {
    u$2(node, classes$k.animationRevealed);
  } // Reset the reveal animation when the drawer is closed


  function close() {
    i$1(node, classes$k.animationRevealed);
  }

  return {
    setup,
    open,
    close
  };
});

var selectors$19 = {
  flyouts: ".collection-flyout",
  animationItems: ".collection-flyout__content, .collection-flyout__footer"
};
var animateFilterFlyout = (node => {
  if (!shouldAnimate(node)) return;
  var flyouts = t$6(selectors$19.flyouts, node);
  flyouts.forEach(flyout => {
    delayOffset(flyout, [selectors$19.animationItems], 1);
  });
});

var selectors$18 = {
  megaNavs: ".mega-navigation-wrapper",
  animationItems: "\n    .mega-navigation__list-parent,\n    .image, .placeholder-svg,\n    .mega-navigation__featured-content,\n    .mega-navigation__feature-text\n    "
};
var classes$j = {
  visible: "visible",
  animationRevealed: "animation--revealed"
};
var animateMegaNavigation = (node => {
  if (!shouldAnimate(node)) return;
  var megaNavs = t$6(selectors$18.megaNavs, node);
  megaNavs.forEach(megaNav => {
    delayOffset(megaNav, [selectors$18.animationItems]);
  }); // Trigger the reveal animation when the drawer is opened

  function open(menu) {
    u$2(menu, classes$j.animationRevealed);
  } // Reset the reveal animation when the drawer is closed


  function close(menu) {
    // remove(menu, classes.animationRevealed);
    if (!a$1(menu, classes$j.visible)) {
      i$1(menu, classes$j.animationRevealed);
    }
  }

  return {
    open,
    close
  };
});

var selectors$17 = {
  animationItems: "\n    .quick-add__product,\n    .product-form__controls-group,\n    .product__policies,\n    .store-availability-container__wrapper\n  "
};
var classes$i = {
  animationRevealed: "animation--revealed"
};
var animateQuickAdd = (node => {
  if (!shouldAnimate(node)) return; // Trigger the reveal animation when the drawer is opened

  function open() {
    delayOffset(node, [selectors$17.animationItems]);
    setTimeout(() => {
      u$2(node, classes$i.animationRevealed);
    }, 100);
  } // Reset the reveal animation when the drawer is closed


  function close() {
    i$1(node, classes$i.animationRevealed);
  }

  return {
    open,
    close
  };
});

var selectors$16 = {
  animationItems: "\n    .store-availability-flyout__product,\n    .store-availability__store-list-title,\n    .store-availability-list__item\n  "
};
var classes$h = {
  animationRevealed: "animation--revealed"
};
var animateStoreAvailability = (node => {
  if (!shouldAnimate(node)) return;
  setup(); // Setup delay offsets

  function setup() {
    delayOffset(node, [selectors$16.animationItems], 1);
  } // Trigger the reveal animation when the drawer is opened


  function open() {
    u$2(node, classes$h.animationRevealed);
  } // Reset the reveal animation when the drawer is closed


  function close() {
    i$1(node, classes$h.animationRevealed);
  }

  return {
    setup,
    open,
    close
  };
});

var selectors$15 = {
  items: "\n    .popup__heading,\n    .popup__message,\n    .popup__form,\n    .popup__verify-age,\n    .popup__decline-age,\n    .popup__footer-text\n  "
};
var classes$g = {
  animationRevealed: "animation--revealed"
};
var animatePopup = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$15.items]); // Trigger the reveal animation when the drawer is opened

  function open() {
    u$2(node, classes$g.animationRevealed);
  } // Reset the reveal animation when the drawer is closed


  function close() {
    i$1(node, classes$g.animationRevealed);
  }

  return {
    open,
    close
  };
});

var selectors$14 = {
  slide: ".carousel__slide"
};
var animateBlogPosts = (node => {
  if (!shouldAnimate(node)) return;
  var offsetSelectors = [selectors$14.slide]; // Last slide wraps and peaks at the start of the list
  // if there are 2 more slides than columns.
  // Start the animation with the last slide

  if (a$1(node, "carousel--columns-wrap-around")) {
    offsetSelectors = ["".concat(selectors$14.slide, ":last-of-type"), "".concat(selectors$14.slide, ":not(:last-of-type)")];
  }

  delayOffset(node, offsetSelectors);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$13 = {
  sectionBlockItems: ".animation--section-introduction > *",
  items: ".collapsible-row-list-item"
};
var animateCollapsibleRowList = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$13.sectionBlockItems, selectors$13.items]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$12 = {
  sectionBlockItems: ".animation--section-introduction > *",
  collection: ".collection-list-grid__collection"
};
var animateCollectionListGrid = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$12.sectionBlockItems, selectors$12.collection]);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$11 = {
  sectionIntro: ".animation--section-introduction > *",
  item: ".grid-display__item"
};
var animateFeaturedCollectionGrid = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$11.sectionIntro, selectors$11.item]);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$10 = {
  sectionIntro: ".animation--section-introduction > *",
  slide: ".featured-collection-row__slide"
};
var animateFeaturedCollectionRow = (node => {
  if (!shouldAnimate(node)) return;
  var {
    textAlignment
  } = node.dataset;
  var columns = parseInt(node.dataset.columns);
  var slides = t$6(selectors$10.slide, node); // Depending on the layout choose which elements to animate and in what order

  if (textAlignment === "right") {
    delayOffset(node, ["".concat(selectors$10.slide, ":nth-child(n+").concat(slides.length - columns + 1, ")"), selectors$10.sectionIntro]);
  } else {
    delayOffset(node, [selectors$10.sectionIntro, "".concat(selectors$10.slide, ":nth-child(-n+").concat(columns, ")")]);
  }

  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$$ = {
  animateBackground: ".animation--section-introduction-background",
  sectionBlockItems: ".animation--section-introduction > *"
};
var animateImageHero = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$$.animateBackground, selectors$$.sectionBlockItems], 3);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$_ = {
  image: ".image-with-text__image .image, .image-with-text__image .placeholder-svg",
  animateBackground: ".animation--section-introduction-background",
  sectionBlockItems: ".animation--section-introduction > *"
};
var animateImageWithText = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$_.image, selectors$_.animateBackground, selectors$_.sectionBlockItems]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$Z = {
  leftColumn: ".image-with-text-split__featured-image .image, .image-with-text-split__featured-image .placeholder-svg, .image-with-text-split__featured-content",
  rightColumn: ".image-with-text-split__image, .image-with-text-split__placeholder, .image-with-text-split__image-wrapper .content-overlay__subheading"
};
var animateImageWithTextSplit = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$Z.leftColumn, selectors$Z.rightColumn]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$Y = {
  sectionIntroduction: ".animation--section-introduction > *",
  image: ".image, .placeholder-svg",
  map: ".location__map-container",
  cta: ".location__map-cta"
};
var animateLocation = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$Y.sectionIntroduction, selectors$Y.image, selectors$Y.map, selectors$Y.cta]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$X = {
  sectionBlockItems: ".animation--section-introduction > *",
  items: ".mosaic-grid__item",
  itemContentsMobile: ".mosaic-grid__item + .mosaic-grid__text-container"
};
var animateMosaicGrid = (node => {
  if (!shouldAnimate(node)) return;
  var sectionBlockItems = t$6(selectors$X.sectionBlockItems, node); // Add the animation delay offset variables

  delayOffset(node, [selectors$X.sectionBlockItems, selectors$X.items]);
  delayOffset(node, [selectors$X.itemContentsMobile], sectionBlockItems.length);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$W = {
  sectionBlockItems: ".animation--section-introduction > *"
};
var animateNewsletter = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$W.sectionBlockItems]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$V = {
  quote: ".quote__item"
};
var animateQuote = (node => {
  if (!shouldAnimate(node)) return;
  var quotes = t$6(selectors$V.quote, node);
  quotes.forEach(quote => delayOffset(quote, [":scope > *"]));
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$U = {
  image: ".image, .placeholder-svg",
  animateBackground: ".animation--section-introduction-background",
  sectionIntro: ".animation--section-introduction > *",
  shoppableItems: ".shoppable-item"
};
var animateShoppable = (node => {
  if (!shouldAnimate(node)) return;
  var animationItems = [selectors$U.animateBackground, selectors$U.sectionIntro, selectors$U.image, selectors$U.shoppableItems];

  if (a$1(node, "shoppable-feature--align-left")) {
    animationItems = [selectors$U.image, selectors$U.animateBackground, selectors$U.sectionIntro, selectors$U.shoppableItems];
  }

  delayOffset(node, animationItems);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$T = {
  sectionIntro: ".animation--section-introduction > *",
  textColumns: ".text-columns__feature"
};
var animateTextColumnsWithImages = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$T.sectionIntro, selectors$T.textColumns]);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$S = {
  animateBackground: ".animation--section-introduction-background",
  sectionBlockItems: ".animation--section-introduction > *"
};
var animateVideoHero = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$S.animateBackground, selectors$S.sectionBlockItems], 3);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$R = {
  slides: ".slideshow__slide",
  animateBackground: ".slideshow__content-inner-container--has-background",
  sectionBlockItems: ".slideshow__content-inner-container > *"
};
var animateSlideshow = (node => {
  if (!shouldAnimate(node)) return;
  var slides = t$6(selectors$R.slides, node);
  slides.forEach(slide => {
    // Add the animation delay offset variables
    delayOffset(slide, [selectors$R.animateBackground, selectors$R.sectionBlockItems], 3);
  });
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$Q = {
  slides: ".slideshow-split__slide",
  animateBackground: ".animation--section-introduction-background",
  sectionBlockItems: ".animation--section-introduction > *"
};
var animateSlideshowSplit = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$Q.slides]);
  delayOffset(node, [selectors$Q.animateBackground, selectors$Q.sectionBlockItems], 3);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$P = {
  sectionBlockItems: ".animation--section-introduction > *"
};
var animateCollectionBanner = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$P.sectionBlockItems], 3);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$O = {
  media: ".product__media > *"
};
var animateProduct = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$O.media]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$N = {
  headerItems: ".blog__heading-inner",
  articleItem: ".blog__article",
  pagination: ".blog__pagination"
};
var animateBlog = (node => {
  if (!shouldAnimate(node)) return;
  delayOffset(node, [selectors$N.headerItems, selectors$N.articleItem, selectors$N.pagination]);
  var observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$M = {
  articleObserverItems: "\n    .article__header,\n    .article__image,\n    .article__content,\n    .article__content-share,\n    .article__tags,\n    .article__pagination,\n    .article__comments\n  ",
  articleHeaderItems: ".article__header > *",
  articleImage: ".article__image",
  articleContent: "\n    .article__content,\n    .article__content-share,\n    .article__tags,\n    .article__pagination,\n    .article__comments\n  "
};
var animateArticle = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$M.articleHeaderItems, selectors$M.articleImage, selectors$M.articleContent]);
  var articleObserverItems = t$6(selectors$M.articleObserverItems, node);
  console.log("articleObserverItems", articleObserverItems);
  var observers = articleObserverItems.map(item => intersectionWatcher(item));
  return {
    destroy() {
      observers.forEach(observer => observer.destroy());
    }

  };
});

var selectors$L = {
  partial: "[data-partial]",
  productItems: ".product-item:not(.animation--item-revealed)"
};
var classes$f = {
  hideProducts: "animation--collection-products-hide",
  itemRevealed: "animation--item-revealed"
};
var animateCollection = (node => {
  if (!shouldAnimate(node)) return;
  var observer = intersectionWatcher(node);
  var partial = n$3(selectors$L.partial, node);
  setupProductItem();

  function setupProductItem() {
    var productItems = t$6(selectors$L.productItems, node);
    delayOffset(node, [selectors$L.productItems], 1);
    setTimeout(() => {
      u$2(productItems, classes$f.itemRevealed);
    }, 50);
  }

  function updateContents() {
    setupProductItem(); // Remove the fade out class

    i$1(partial, classes$f.hideProducts);
  }

  function infiniteScrollReveal() {
    setupProductItem();
  }

  return {
    updateContents,
    infiniteScrollReveal,

    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$K = {
  heading: ".list-collections__heading",
  items: ".list-collections--columns__collection"
};
var animateListCollections = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$K.heading, selectors$K.items]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$J = {
  items: "\n    .contact__image > .image, .contact__image > .placeholder-svg,\n    .contact__heading,\n    .contact__text,\n    .contact__form > *,\n    .animation--section-introduction > *,\n    .about__block,\n    .page__content\n  "
};
var animatePage = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$J.items]);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$I = {
  items: "\n    .password__header > .overline,\n    .password__heading,\n    .password__subheading,\n    .password__text,\n    .password__notify-form,\n    .password__share\n  "
};
var animatePassword = (node => {
  if (!shouldAnimate(node)) return; // Add the animation delay offset variables

  delayOffset(node, [selectors$I.items], 3);
  var observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$H = {
  partial: "[data-partial]",
  items: "\n    .search-template__heading > *:not(.animation--item-revealed),\n    .search-template__filter-buttons:not(.animation--item-revealed),\n    .search-template__top-row:not(.animation--item-revealed),\n    .search-template__item:not(.animation--item-revealed),\n    .search-template__pagination:not(.animation--item-revealed)\n  "
};
var classes$e = {
  hideItems: "animation--search-items-hide",
  itemRevealed: "animation--item-revealed"
};
var animateSearch = (node => {
  if (!shouldAnimate(node)) return;
  var observer = intersectionWatcher(node);
  var partial = n$3(selectors$H.partial, node);
  setupDelays();

  function setupDelays() {
    var items = t$6(selectors$H.items, node);
    delayOffset(node, [selectors$H.items], 1);
    setTimeout(() => {
      u$2(items, classes$e.itemRevealed);
    }, 50);
  }

  function updateContents() {
    setupDelays(); // Remove the fade out class

    i$1(partial, classes$e.hideItems);
  }

  return {
    updateContents,

    destroy() {
      observer === null || observer === void 0 ? void 0 : observer.destroy();
    }

  };
});

var selectors$G = {
  carousel: "[data-carousel]",
  slides: ".carousel__slide",
  carouselWraps: "carousel--columns-wrap-around",
  textBlock: ".text-block",
  nextButton: ".carousel__next-button",
  previousButton: ".carousel__previous-button",
  textBlock: ".text-block"
}; // carouslePosition denotes where the carousel lies within the container
// depending on if there is text content above or below. Carousel navigation
// paddles will be adjusted to the carousel.

var carousel = function carousel(node) {
  var {
    carouselPosition = "bottom"
  } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var carousel = null;
  var carouselAnimation = null;
  var {
    textPosition,
    textAlignment
  } = node.dataset;
  var carouselIsInline = textPosition === "middle";
  var carouselWraps = node.classList.contains(selectors$G.carouselWraps);
  var navPrevButton = node.querySelector(selectors$G.previousButton);
  var navNextButton = node.querySelector(selectors$G.nextButton);
  var carouselContainer = node.querySelector(selectors$G.carousel);
  var slides = node.querySelectorAll(selectors$G.slides);
  var textBlock = node.querySelector(selectors$G.textBlock);

  var _init = () => {
    import(flu.chunks.flickity).then(_ref => {
      var {
        Flickity
      } = _ref;
      var carouselOpts = {
        adaptiveHeight: false,
        wrapAround: false,
        contain: true,
        cellAlign: "left",
        prevNextButtons: false,
        pageDots: false,
        initialIndex: 0,
        dragThreshold: 1
      }; // Only wrap around if there is enough content to wrap

      if (carouselWraps) {
        carouselOpts.wrapAround = true;
      } else if (!carouselWraps && textAlignment == "right") {
        carouselOpts.initialIndex = slides.length - 1;
        carouselOpts.cellAlign = "right";
      }

      carousel = new Flickity(carouselContainer, _objectSpread2(_objectSpread2({}, carouselOpts), {}, {
        on: {
          ready: function ready() {
            _initNavigation();

            carouselAnimation = animateCarousel(node);
          },
          scroll: progress => {
            if (carouselIsInline) {
              _updateTextBlock(progress);
            }

            if (!carouselWraps) {
              _updateNavigation(progress);
            }
          }
        }
      }));
      carouselContainer.addEventListener("dragStart", () => document.ontouchmove = () => false);
      carouselContainer.addEventListener("dragEnd", () => document.ontouchmove = () => true);
      carousel.resize();
      setTimeout(() => {
        _updateNavigationPosition(carousel.size.height);
      }, 1000);
    });
  };

  var _updateTextBlock = progress => {
    if (!textBlock) return;
    var progressScale = progress * 100;

    if (textAlignment == "left") {
      textBlock.classList.toggle("out-of-view", progressScale > 1);
    } else if (textAlignment == "right") {
      textBlock.classList.toggle("out-of-view", progressScale < 99);
    }
  };

  var _updateNavigation = progress => {
    var progressScale = progress * 100; // Need to hide the prev/next navigation if progress meets thresholds
    // https://github.com/metafizzy/flickity/issues/289

    navPrevButton.disabled = progressScale < 1;
    navPrevButton.setAttribute("focusable", progressScale < 1 ? false : true);
    navNextButton.disabled = progressScale > 99;
    navNextButton.setAttribute("focusable", progressScale > 99 ? false : true);
  };

  var _initNavigation = () => {
    navPrevButton.addEventListener("click", _previousSlide);
    navNextButton.addEventListener("click", _nextSlide);

    if (!carouselWraps && textAlignment == "right") {
      navNextButton.disabled = true;
      navNextButton.setAttribute("focusable", false);
    } else if (!carouselWraps) {
      navPrevButton.disabled = true;
      navPrevButton.setAttribute("focusable", false);
    }
  };

  var _updateNavigationPosition = carouselHeight => {
    var buttonHeight = navNextButton.clientHeight;
    var containerPadding = parseFloat(window.getComputedStyle(node).getPropertyValue("padding-top"));
    var offset = carouselHeight / 2 - buttonHeight / 2 + containerPadding;
    navNextButton.style[carouselPosition] = "".concat(offset, "px");
    navPrevButton.style[carouselPosition] = "".concat(offset, "px");
    navNextButton.classList.remove("hidden");
    navPrevButton.classList.remove("hidden");
  };

  var _nextSlide = () => {
    carousel.next();
  };

  var _previousSlide = () => {
    carousel.previous();
  };

  _init();

  var unload = () => {
    var _carouselAnimation;

    carousel.destroy();
    (_carouselAnimation = carouselAnimation) === null || _carouselAnimation === void 0 ? void 0 : _carouselAnimation.destroy();
    navPrevButton.removeEventListener("click", _previousSlide);
    navNextButton.removeEventListener("click", _nextSlide);
  };

  var goToSlide = index => {
    carousel.select(index);
  };

  return {
    unload,
    goToSlide
  };
};

var selectors$F = {
  slider: "[data-carousel]",
  wrappingContainer: ".complementary-products",
  complementaryProducts: "[data-complementary-products]",
  complementaryProductsContent: "[data-complementary-products-content]"
};
var classes$d = {
  hasSlider: "complementary-products__content--has-slider",
  hidden: "hidden"
};

var complementaryProducts = node => {
  var complementaryProducts = t$6(selectors$F.complementaryProducts, node);
  if (!complementaryProducts.length) return;
  var carousels = [];
  var {
    recommendationsType,
    productId: id,
    sectionId,
    layout,
    maxRecommendations
  } = complementaryProducts[0].dataset;

  if (recommendationsType === "app-recommendations") {
    handleRecommendedProducts();
  } else {
    initSlider();
  }

  function handleRecommendedProducts() {
    var requestUrl = "".concat(window.theme.routes.productRecommendations, "?section_id=").concat(sectionId, "&limit=").concat(maxRecommendations, "&product_id=").concat(id, "&intent=complementary");
    fetch(requestUrl).then(response => response.text()).then(text => {
      var html = document.createElement("div");
      html.innerHTML = text;
      var recommendations = n$3(selectors$F.complementaryProductsContent, html);

      if (recommendations && recommendations.innerHTML.trim().length) {
        complementaryProducts.forEach(block => block.innerHTML = recommendations.innerHTML); // Remove hidden flag as content has been fetched

        complementaryProducts.forEach(block => {
          i$1(block.closest(selectors$F.wrappingContainer), classes$d.hidden);
        });
        initSlider();
      }
    }).catch(error => {
      throw error;
    });
  }

  function initSlider() {
    if (layout !== "slider") return;
    complementaryProducts.forEach(block => {
      var sliderElement = n$3(selectors$F.slider, block);

      if (a$1(sliderElement, classes$d.hasSlider)) {
        carousels.push(carousel(block));
        u$2(block, "slider-enabled");
      }
    });
  }

  function unload() {
    carousels.forEach(carousel => carousel.destroy());
  }

  return {
    unload
  };
};

var _excluded = ["variant_id", "product_title", "original_line_price", "price", "variant_title", "line_level_discount_allocations", "options_with_values", "product_has_only_default_variant", "image", "url", "quantity", "unit_price", "unit_price_measurement", "selling_plan_allocation"],
    _excluded2 = ["handle", "title", "url", "featured_image"];
var plus = "<svg width=\"11\" height=\"11\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5.5 0v11M0 5.5h11\" stroke=\"currentColor\"/></svg>";
var minus = "<svg width=\"10\" height=\"2\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M1 1h8\" stroke=\"currentColor\" stroke-linecap=\"square\"/></svg>";

var renderLineDiscounts = discounts => {
  if (Boolean(discounts.length)) {
    var formatted_discounts = discounts.map(_ref => {
      var {
        amount,
        discount_application: {
          title
        }
      } = _ref;
      return "<li>".concat(title, " (-").concat(formatMoney$1(amount), ")</li>");
    });
    return "\n      <ul class=\"quick-cart__item-discounts\">\n        ".concat(formatted_discounts, "\n      </ul>\n    ");
  } else {
    return "";
  }
};

function createItem(_ref2, highlightProduct) {
  var {
    variant_id: id,
    product_title: title,
    original_line_price: original_price,
    price,
    variant_title: color,
    line_level_discount_allocations: line_discounts,
    options_with_values,
    product_has_only_default_variant,
    image,
    url,
    quantity,
    unit_price,
    unit_price_measurement,
    selling_plan_allocation
  } = _ref2;
      _objectWithoutProperties(_ref2, _excluded);

  var img = image && getSizedImageUrl(image.replace("." + imageSize(image), ""), "200x");
  var priceQuanity = "";

  if (quantity > 1) {
    priceQuanity = "x ".concat(quantity);
  }

  var productOptions = "";
  var quantityZeroLeading = quantity > 9 ? quantity : "0".concat(quantity);

  if (!product_has_only_default_variant) {
    options_with_values.forEach(option => {
      var optionItem = "\n        <div>\n          ".concat(option.name, ": ").concat(option.value, "\n        </div>\n      ");
      productOptions += optionItem;
    });
  }

  var sellingPlanName = selling_plan_allocation ? "<p class=\"type-body-regular mt0 mb0\">".concat(selling_plan_allocation.selling_plan.name, "</p>") : "";
  return (
    /*html*/
    "\n    <div class='cart__item".concat(highlightProduct ? " cart__item--highlight" : "", "' data-component='quickCartItem' data-id=").concat(id, ">\n      <div class=\"cart__item-content\">\n        <div class='quick-cart__image'>\n        ").concat(img ? "\n              <a href='".concat(url, "'>\n                <img src='").concat(img, "' alt='").concat(title, "' />\n              </a>\n            ") : "<div class=\"placeholder\"></div>", "\n        </div>\n        <div class='quick-cart__product-details justify-between'>\n          <div>\n            <h4 class=\"ma0\">\n              <a href='").concat(url, "'>").concat(title, "</a>\n            </h4>\n            <span class=\"quick-cart__product-price\">\n              <span class=\"quick-cart__product-price-value\">\n                ").concat(formatMoney$1(price), " <span>").concat(priceQuanity, "</span>\n              </span>\n              ").concat(renderUnitPrice(unit_price, unit_price_measurement), "\n              ").concat(renderLineDiscounts(line_discounts), "\n              ").concat(sellingPlanName, "\n            </span>\n            ").concat(productOptions, "\n          </div>\n        </div>\n      </div>\n\n      <div class='quick-cart__item-bottom'>\n        <div class='quick-cart__quantity'>\n          <button type=\"button\" class='quick-cart__quantity-button js-remove-single px05'>").concat(minus, "</button>\n          <div class='quick-cart__item-total js-single-quantity'>").concat(quantityZeroLeading, "</div>\n          <button type=\"button\" class='quick-cart__quantity-button js-add-single px05'>").concat(plus, "</button>\n        </div>\n      </div>\n    </div>\n  ")
  );
}
function createRecent(_ref3) {
  var {
    handle,
    title,
    url,
    featured_image: image
  } = _ref3,
      product = _objectWithoutProperties(_ref3, _excluded2);

  var img = image && getSizedImageUrl(image.replace("." + imageSize(image), ""), "200x");
  return (
    /*html*/
    "\n    <div class=\"cart__item justify-around\">\n      <div class=\"cart__item-content\">\n        <div class=\"quick-cart__image\">\n          ".concat(img ? "\n              <a href='".concat(url, "'>\n                <img src='").concat(img, "' />\n              </a>\n            ") : "<div class=\"placeholder\"></div>", "\n        </div>\n        <div class=\"quick-cart__product-details\">\n          <a href=\"").concat(url, "\">\n            <h3 class=\"ma0\">").concat(title, "</h3>\n          </a>\n          <span class=\"quick-cart__product-price\">").concat(formatMoney$1(product.price), "</span>\n        </div>\n      </div>\n    </div>\n  ")
  );
}

var ls$1 = {
  get: () => JSON.parse(localStorage.getItem("recentlyViewed")),
  set: val => localStorage.setItem("recentlyViewed", val)
};
var updateRecentProducts = product => {
  var recentlyViewed = [];

  if (ls$1.get() !== null) {
    recentlyViewed = ls$1.get().filter(item => item.id !== product.id);
    recentlyViewed.unshift(product);
    ls$1.set(JSON.stringify(recentlyViewed.slice(0, 20)));
  } else if (ls$1.get() === null) {
    recentlyViewed.push(product);
    ls$1.set(JSON.stringify(recentlyViewed));
  }
};
var getRecentProducts = () => ls$1.get();

var quickCartItem = item => {
  var decrease = item.querySelector(".js-remove-single");
  var increase = item.querySelector(".js-add-single");
  var currentQty = item.querySelector(".js-single-quantity").innerHTML;
  var id = item.getAttribute("data-id");
  decrease.addEventListener("click", e => {
    e.preventDefault();

    if (currentQty === 1) {
      removeAddon(id);
    } else {
      updateAddon(id, parseInt(currentQty) - 1);
    }
  });
  increase.addEventListener("click", e => {
    e.preventDefault();
    updateAddon(id, parseInt(currentQty) + 1);
  });
};

function renderItems(items) {
  return items.length > 0 ? items.reduce((markup, item) => {
    var hightlightProduct = u().newItemInCart; // Only the first product should be highlighted. If a product
    // is highlighted set the flag to false after the first

    if (hightlightProduct) {
      o({
        newItemInCart: false
      });
    }

    markup += createItem(item, hightlightProduct);
    return markup;
  }, "") : "<p class=\"quick-cart__empty-state\">".concat(theme.strings.cart.general.empty, "</p>");
}

function renderDiscounts(discounts) {
  return discounts.length > 0 ? "\n    <div>\n      ".concat(discounts.map(_ref => {
    var {
      title,
      total_allocated_amount: value
    } = _ref;
    return "<div>".concat(title, " (-").concat(formatMoney$1(value), ")</div>");
  }), "\n    </div>\n  ") : "";
}

function renderRecent(products) {
  return products.length > 0 ? products.reduce((markup, product) => {
    markup += createRecent(product);
    return markup;
  }, "") : "<p class=\"quick-cart__empty-state\">".concat(general.products.no_recently_viewed, "</p>");
}

var selectors$E = {
  cartItems: ".cart__item"
};

var cartDrawer = node => {
  if (!node) return;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var discounts = node.querySelector(".js-discounts");
  var subtotal = node.querySelector(".js-subtotal");
  var itemsRoot = node.querySelector(".js-items");
  var footer = node.querySelector(".js-footer");
  var closeIcon = node.querySelector(".js-close");
  var loading = itemsRoot.innerHTML;
  var tabLinkCart = node.querySelector(".js-tab-link-cart");
  var tabLinkRecent = node.querySelector(".js-tab-link-recent");
  var cartDrawerAnimation = animateCartDrawer(node);

  var render = cart => {
    var {
      cart_level_discount_applications: cart_discounts
    } = cart;
    tabLinkCart.classList.add("active");
    tabLinkRecent.classList.remove("active");
    itemsRoot.innerHTML = renderItems(cart.items);
    var cartItems = itemsRoot.querySelectorAll(selectors$E.cartItems);

    if (cartItems.length) {
      cartItems.forEach(item => {
        quickCartItem(item);
      });
    }

    if (getRecentProducts()) {
      tabLinkRecent.classList.remove("hide");
    }

    discounts.innerHTML = renderDiscounts(cart_discounts);
    cart.items.length > 0 ? footer.classList.add("active") : footer.classList.remove("active");
    Boolean(cart_discounts.length > 0) ? discounts.classList.add("active") : discounts.classList.remove("active");

    if (subtotal) {
      subtotal.innerHTML = formatMoney$1(cart.total_price);
    }

    cartDrawerAnimation === null || cartDrawerAnimation === void 0 ? void 0 : cartDrawerAnimation.setup();
  };

  var open = cart => {
    node.classList.add("is-visible");
    r$1("drawerOverlay:show");
    node.classList.add("is-active");
    itemsRoot.innerHTML = loading;
    r$1("cart:open", state => {
      return {
        cartOpen: true
      };
    });
    closeIcon.setAttribute("aria-expanded", true);
    setTimeout(() => {
      getCart().then(cart => dispatchCustomEvent(CustomEvents.quickCartOpen, {
        cart: cart
      }));
      focusTrap.activate();
      tabLinkCart.classList.add("active");
      setTimeout(() => {
        render(cart);
        setTimeout(() => {
          cartDrawerAnimation === null || cartDrawerAnimation === void 0 ? void 0 : cartDrawerAnimation.open();
        }, 10);
      }, 10);
    }, 50);
  };

  var close = function close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    hideOverlay && r$1("drawerOverlay:hide");
    node.classList.remove("is-visible");
    document.querySelectorAll('[aria-controls="cart-flyout-drawer"]').forEach(control => {
      control.setAttribute("aria-expanded", false);
    });
    r$1("cart:close", state => {
      return {
        cartOpen: false
      };
    });
    tabLinkRecent.classList.remove("active");
    tabLinkCart.classList.remove("active");
    setTimeout(() => {
      focusTrap.deactivate();
      o({
        cartOpen: false
      });
      dispatchCustomEvent(CustomEvents.quickCartClose);
      cartDrawerAnimation === null || cartDrawerAnimation === void 0 ? void 0 : cartDrawerAnimation.close();
    }, 50);
  };

  var overlayHideListener = c$1("drawerOverlay:hiding", () => close(false));

  var viewCart = () => {
    tabLinkCart.classList.add("active");
    tabLinkRecent.classList.remove("active");
    var cart = u().cart;
    render(cart);
  };

  var viewRecent = products => {
    if (!products) return;
    tabLinkCart.classList.remove("active");
    tabLinkRecent.classList.add("active");
    footer.classList.remove("active");
    itemsRoot.innerHTML = renderRecent(products);
  };

  var handleKeyboard = e => {
    var cartOpen = u().cartOpen;

    if (!cartOpen) {
      return;
    }

    if (e.key == "Escape" || e.keyCode === 27 && drawerOpen) {
      close();
    }
  };

  render(u().cart);
  tabLinkCart.addEventListener("click", e => e.preventDefault() || viewCart());
  tabLinkRecent.addEventListener("click", e => e.preventDefault() || viewRecent(getRecentProducts()));
  closeIcon.addEventListener("click", close);
  c$1("cart:toggle", _ref2 => {
    var {
      cart,
      cartOpen
    } = _ref2;
    cartOpen ? open(cart) : close();
  });
  c$1("cart:updated", _ref3 => {
    var {
      cartOpen,
      cart
    } = _ref3;

    // Rerender the cart list only if cart is open
    if (cartOpen) {
      render(cart);
    } else {
      o({
        cartOpen: true
      });
      open(cart);
    }
  });
  window.addEventListener("keydown", handleKeyboard);

  var unload = () => {
    window.removeEventListener("keydown", handleKeyboard);
    overlayHideListener();
  };

  return {
    unload,
    open
  };
};

var classes$c = {
  visible: "is-visible"
};
var selectors$D = {
  closeBtn: "[data-modal-close]",
  modalContent: ".modal__content",
  accordion: ".accordion"
};

var modal = node => {
  if (!node) return;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var modalContent = n$3(selectors$D.modalContent, node);
  var accordions = [];
  var events = [e$3(n$3(selectors$D.closeBtn, node), "click", e => {
    e.preventDefault();

    _close();
  }), e$3(node, "keydown", _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  }), c$1("drawerOverlay:hiding", () => _close(false)), c$1("modal:open", (state, _ref2) => {
    var {
      modalContent
    } = _ref2;

    _renderModalContent(modalContent);

    _open();
  })];

  var _renderModalContent = content => {
    var clonedContent = content.cloneNode(true);
    modalContent.innerHTML = "";
    modalContent.appendChild(clonedContent);

    _initAccordion();
  };

  var _initAccordion = () => {
    // Handle all accordion shortcodes
    var accordionElements = modalContent.querySelectorAll(selectors$D.accordion);

    if (accordionElements.length) {
      accordionElements.forEach(item => {
        accordions.push(accordion(item));
      });
    }
  };

  var _open = () => {
    u$2(node, classes$c.visible);
    n$3(selectors$D.closeBtn, node).setAttribute("aria-expanded", true);
    focusTrap.activate();
    r$1("drawerOverlay:show");
  };

  var _close = function _close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    modalContent.innerHTML = "";
    focusTrap.deactivate();
    hideOverlay && r$1("drawerOverlay:hide");
    i$1(node, classes$c.visible);
    t$6("[aria-controls=\"".concat(node.id, "\"]")).forEach(controls => {
      controls.setAttribute("aria-expanded", false);
    });
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    accordions.forEach(accordion => accordion.unload());
  };

  return {
    unload
  };
};

var browser = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {
  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];

  if (root) {
    this.root(root);
  }
  /** @type function() */


  this.handle = Delegate.prototype.handle.bind(this); // Cache of event listeners removed during an event cycle

  this._removedListeners = [];
}
/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.root = function (root) {
  var listenerMap = this.listenerMap;
  var eventType; // Remove master event listeners

  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }

    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  } // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here


  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }

    return this;
  }
  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */


  this.rootElement = root; // Set up master event listeners

  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }

  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};
/**
 * @param {string} eventType
 * @returns boolean
 */


Delegate.prototype.captureForType = function (eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};
/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {boolean} [useCapture] see 'useCapture' in <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.on = function (eventType, selector, handler, useCapture) {
  var root;
  var listenerMap;
  var matcher;
  var matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  } // handler can be passed as
  // the second or third argument


  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // Fallback to sensible defaults
  // if useCapture not set


  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0]; // Add master handler for type if not created yet

  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }

    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null; // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.

    matcher = matchesRoot.bind(this); // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = Element.prototype.matches;
  } // Add to the list of listeners


  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });
  return this;
};
/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.off = function (eventType, selector, handler, useCapture) {
  var i;
  var listener;
  var listenerMap;
  var listenerList;
  var singleEventType; // Handler can be passed as
  // the second or third argument

  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // If useCapture not set, remove
  // all event listeners


  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];

  if (!listenerList || !listenerList.length) {
    return this;
  } // Remove only parameter matches
  // if specified


  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      this._removedListeners.push(listener);

      listenerList.splice(i, 1);
    }
  } // All listeners removed


  if (!listenerList.length) {
    delete listenerMap[eventType]; // Remove the main handler

    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};
/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */


Delegate.prototype.handle = function (event) {
  var i;
  var l;
  var type = event.type;
  var root;
  var phase;
  var listener;
  var returned;
  var listenerList = [];
  var target;
  var eventIgnore = 'ftLabsDelegateIgnore';

  if (event[eventIgnore] === true) {
    return;
  }

  target = event.target; // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8

  if (target.nodeType === 3) {
    target = target.parentNode;
  } // Handle SVG <use> elements in IE


  if (target.correspondingUseElement) {
    target = target.correspondingUseElement;
  }

  root = this.rootElement;
  phase = event.eventPhase || (event.target !== event.currentTarget ? 3 : 2); // eslint-disable-next-line default-case

  switch (phase) {
    case 1:
      //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
      break;

    case 2:
      //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) {
        listenerList = listenerList.concat(this.listenerMap[0][type]);
      }

      if (this.listenerMap[1] && this.listenerMap[1][type]) {
        listenerList = listenerList.concat(this.listenerMap[1][type]);
      }

      break;

    case 3:
      //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
      break;
  }

  var toFire = []; // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.

  l = listenerList.length;

  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i]; // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.

      if (!listener) {
        break;
      }

      if (target.tagName && ["button", "input", "select", "textarea"].indexOf(target.tagName.toLowerCase()) > -1 && target.hasAttribute("disabled")) {
        // Remove things that have previously fired
        toFire = [];
      } // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      else if (listener.matcher.call(target, listener.matcherParam, target)) {
          toFire.push([event, target, listener]);
        }
    } // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached


    if (target === root) {
      break;
    }

    l = listenerList.length; // Fall back to parentNode since SVG children have no parentElement in IE

    target = target.parentElement || target.parentNode; // Do not traverse up to document root when using parentNode, though

    if (target instanceof HTMLDocument) {
      break;
    }
  }

  var ret;

  for (i = 0; i < toFire.length; i++) {
    // Has it been removed during while the event function was fired
    if (this._removedListeners.indexOf(toFire[i][2]) > -1) {
      continue;
    }

    returned = this.fire.apply(this, toFire[i]); // Stop propagation to subsequent
    // callbacks if the callback returned
    // false

    if (returned === false) {
      toFire[i][0][eventIgnore] = true;
      toFire[i][0].preventDefault();
      ret = false;
      break;
    }
  }

  return ret;
};
/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */


Delegate.prototype.fire = function (event, target, listener) {
  return listener.handler.call(target, event, target);
};
/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}
/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesRoot(selector, element) {
  if (this.rootElement === window) {
    return (// Match the outer document (dispatched from document)
      element === document || // The <html> element (dispatched from document.body or document.documentElement)
      element === document.documentElement || // Or the window itself (dispatched from window)
      element === window
    );
  }

  return this.rootElement === element;
}
/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesId(id, element) {
  return id === element.id;
}
/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */


Delegate.prototype.destroy = function () {
  this.off();
  this.root();
};

var _default = Delegate;
exports.default = _default;
module.exports = exports.default;
}(browser, browser.exports));

var Delegate = /*@__PURE__*/getDefaultExportFromCjs(browser.exports);

/**
 * Returns a product JSON object when passed a product URL
 * @param {*} url
 */

/**
 * Convert the Object (with 'name' and 'value' keys) into an Array of values, then find a match & return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Object} collection Object with 'name' and 'value' keys (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromSerializedArray(product, collection) {
  _validateProductStructure(product);

  // If value is an array of options
  var optionArray = _createOptionArrayFromOptionCollection(product, collection);
  return getVariantFromOptionArray(product, optionArray);
}

/**
 * Find a match in the project JSON (using Array with option values) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Array} options List of submitted values (e.g. ['36', 'Black'])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromOptionArray(product, options) {
  _validateProductStructure(product);
  _validateOptionsArray(options);

  var result = product.variants.filter(function(variant) {
    return options.every(function(option, index) {
      return variant.options[index] === option;
    });
  });

  return result[0] || null;
}

/**
 * Creates an array of selected options from the object
 * Loops through the project.options and check if the "option name" exist (product.options.name) and matches the target
 * @param {Object} product Product JSON object
 * @param {Array} collection Array of object (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Array} The result of the matched values. (e.g. ['36', 'Black'])
 */
function _createOptionArrayFromOptionCollection(product, collection) {
  _validateProductStructure(product);
  _validateSerializedArray(collection);

  var optionArray = [];

  collection.forEach(function(option) {
    for (var i = 0; i < product.options.length; i++) {
      if (product.options[i].name.toLowerCase() === option.name.toLowerCase()) {
        optionArray[i] = option.value;
        break;
      }
    }
  });

  return optionArray;
}

/**
 * Check if the product data is a valid JS object
 * Error will be thrown if type is invalid
 * @param {object} product Product JSON object
 */
function _validateProductStructure(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (Object.keys(product).length === 0 && product.constructor === Object) {
    throw new Error(product + ' is empty.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted like jQuery's serializeArray()
 * @param {Array} collection Array of object [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }]
 */
function _validateSerializedArray(collection) {
  if (!Array.isArray(collection)) {
    throw new TypeError(collection + ' is not an array.');
  }

  if (collection.length === 0) {
    return [];
  }

  if (collection[0].hasOwnProperty('name')) {
    if (typeof collection[0].name !== 'string') {
      throw new TypeError(
        'Invalid value type passed for name of option ' +
          collection[0].name +
          '. Value should be string.'
      );
    }
  } else {
    throw new Error(collection[0] + 'does not contain name key.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted as list of values
 * @param {Array} collection Array of object (e.g. ['36', 'Black'])
 */
function _validateOptionsArray(options) {
  if (Array.isArray(options) && typeof options[0] === 'object') {
    throw new Error(options + 'is not a valid array of options.');
  }
}

// Public Methods
// -----------------------------------------------------------------------------

/**
 * Returns a URL with a variant ID query parameter. Useful for updating window.history
 * with a new URL based on the currently select product variant.
 * @param {string} url - The URL you wish to append the variant ID to
 * @param {number} id  - The variant ID you wish to append to the URL
 * @returns {string} - The new url which includes the variant ID query parameter
 */

function getUrlWithVariant(url, id) {
  if (/variant=/.test(url)) {
    return url.replace(/(variant=)[^&]+/, '$1' + id);
  } else if (/\?/.test(url)) {
    return url.concat('&variant=').concat(id);
  }

  return url.concat('?variant=').concat(id);
}

var selectors$C = {
  idInput: '[name="id"]',
  optionInput: '[name^="options"]',
  quantityInput: '[name="quantity"]',
  propertyInput: '[name^="properties"]'
};
var defaultOptions = {
  variantSelector: selectors$C.idInput
};
function ProductForm(form, prod) {
  var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var config = Object.assign({}, defaultOptions, opts);
  var product = validateProductObject(prod);
  var events = [];

  var _addEvent = (element, action, func) => {
    element.addEventListener(action, func, true);
    events.push({
      element,
      action,
      func
    });
  };

  var getOptions = () => {
    return _serializeOptionValues(optionInputs, function (item) {
      var regex = /(?:^(options\[))(.*?)(?:\])/;
      item.name = regex.exec(item.name)[2]; // Use just the value between 'options[' and ']'

      return item;
    });
  };

  var getVariant = () => {
    return getVariantFromSerializedArray(product, getOptions());
  };

  var getProperties = () => {
    var properties = _serializePropertyValues(propertyInputs, function (propertyName) {
      var regex = /(?:^(properties\[))(.*?)(?:\])/;
      var name = regex.exec(propertyName)[2]; // Use just the value between 'properties[' and ']'

      return name;
    });

    return Object.entries(properties).length === 0 ? null : properties;
  };

  var getQuantity = () => {
    return quantityInputs[0] ? Number.parseInt(quantityInputs[0].value, 10) : 1;
  };

  var getProductFormEventData = () => ({
    options: getOptions(),
    variant: getVariant(),
    properties: getProperties(),
    quantity: getQuantity()
  });

  var onFormEvent = cb => {
    if (typeof cb === "undefined") return;
    return event => {
      event.dataset = getProductFormEventData();
      cb(event);
    };
  };

  var setIdInputValue = value => {
    var idInputElement = form.querySelector(config.variantSelector);

    if (!idInputElement) {
      idInputElement = document.createElement("input");
      idInputElement.type = "hidden";
      idInputElement.name = "id";
      form.appendChild(idInputElement);
    }

    idInputElement.value = value.toString();
  };

  var onSubmit = event => {
    event.dataset = getProductFormEventData();
    setIdInputValue(event.dataset.variant.id);

    if (config.onFormSubmit) {
      config.onFormSubmit(event);
    }
  };

  var initInputs = (selector, cb) => {
    var elements = [...form.querySelectorAll(selector)];
    return elements.map(element => {
      _addEvent(element, "change", onFormEvent(cb));

      return element;
    });
  };

  _addEvent(form, "submit", onSubmit);

  var optionInputs = initInputs(selectors$C.optionInput, config.onOptionChange);
  var quantityInputs = initInputs(selectors$C.quantityInput, config.onQuantityChange);
  var propertyInputs = initInputs(selectors$C.propertyInput, config.onPropertyChange);

  var destroy = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  return {
    getVariant,
    destroy
  };
}

function validateProductObject(product) {
  if (typeof product !== "object") {
    throw new TypeError(product + " is not an object.");
  }

  if (typeof product.variants[0].options === "undefined") {
    throw new TypeError("Product object is invalid. Make sure you use the product object that is output from {{ product | json }} or from the http://[your-product-url].js route");
  }

  return product;
}

function _serializeOptionValues(inputs, transform) {
  return inputs.reduce(function (options, input) {
    if (input.checked || // If input is a checked (means type radio or checkbox)
    input.type !== "radio" && input.type !== "checkbox" // Or if its any other type of input
    ) {
      options.push(transform({
        name: input.name,
        value: input.value
      }));
    }

    return options;
  }, []);
}

function _serializePropertyValues(inputs, transform) {
  return inputs.reduce(function (properties, input) {
    if (input.checked || // If input is a checked (means type radio or checkbox)
    input.type !== "radio" && input.type !== "checkbox" // Or if its any other type of input
    ) {
      properties[transform(input.name)] = input.value;
    }

    return properties;
  }, {});
}

var selectors$B = {
  drawerTrigger: "[data-store-availability-drawer-trigger]",
  drawer: "[data-store-availability-drawer]",
  productTitle: "[data-store-availability-product-title]",
  storeList: "[data-store-availability-list-content]"
};

var storeAvailability = (container, product, variant) => {
  var storeList = null;
  var currentVariant = variant;
  var delegate = new Delegate(container);

  var _clickHandler = e => {
    e.preventDefault();
    r$1("availability:showMore", () => ({
      product,
      variant: currentVariant,
      storeList
    }));
  };

  var update = variant => {
    currentVariant = variant;
    var variantSectionUrl = "".concat(container.dataset.baseUrl, "/variants/").concat(variant.id, "/?section_id=store-availability");
    fetch(variantSectionUrl).then(response => {
      return response.text();
    }).then(storeAvailabilityHTML => {
      container.innerHTML = "";
      if (storeAvailabilityHTML.trim() === "") return; // Remove section wrapper that throws nested sections error

      container.innerHTML = storeAvailabilityHTML;
      container.innerHTML = container.firstElementChild.innerHTML;
      storeList = n$3(selectors$B.storeList, container);
    });
  }; // Intialize


  update(variant);
  delegate.on("click", selectors$B.drawerTrigger, _clickHandler);

  var unload = () => {
    container.innerHTML = "";
  };

  return {
    unload,
    update
  };
};

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Older browsers don't support event options, feature detect it.

// Adopted and modified solution from Bohdan Didukh (2017)
// https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

var hasPassiveEvents = false;
if (typeof window !== 'undefined') {
  var passiveTestOptions = {
    get passive() {
      hasPassiveEvents = true;
      return undefined;
    }
  };
  window.addEventListener('testPassive', null, passiveTestOptions);
  window.removeEventListener('testPassive', null, passiveTestOptions);
}

var isIosDevice = typeof window !== 'undefined' && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);


var locks = [];
var documentListenerAdded = false;
var initialClientY = -1;
var previousBodyOverflowSetting = void 0;
var previousBodyPaddingRight = void 0;

// returns true if `el` should be allowed to receive touchmove events.
var allowTouchMove = function allowTouchMove(el) {
  return locks.some(function (lock) {
    if (lock.options.allowTouchMove && lock.options.allowTouchMove(el)) {
      return true;
    }

    return false;
  });
};

var preventDefault = function preventDefault(rawEvent) {
  var e = rawEvent || window.event;

  // For the case whereby consumers adds a touchmove event listener to document.
  // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
  // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
  // the touchmove event on document will break.
  if (allowTouchMove(e.target)) {
    return true;
  }

  // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1) return true;

  if (e.preventDefault) e.preventDefault();

  return false;
};

var setOverflowHidden = function setOverflowHidden(options) {
  // If previousBodyPaddingRight is already set, don't set it again.
  if (previousBodyPaddingRight === undefined) {
    var _reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
    var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    if (_reserveScrollBarGap && scrollBarGap > 0) {
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = scrollBarGap + 'px';
    }
  }

  // If previousBodyOverflowSetting is already set, don't set it again.
  if (previousBodyOverflowSetting === undefined) {
    previousBodyOverflowSetting = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};

var restoreOverflowSetting = function restoreOverflowSetting() {
  if (previousBodyPaddingRight !== undefined) {
    document.body.style.paddingRight = previousBodyPaddingRight;

    // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
    // can be set again.
    previousBodyPaddingRight = undefined;
  }

  if (previousBodyOverflowSetting !== undefined) {
    document.body.style.overflow = previousBodyOverflowSetting;

    // Restore previousBodyOverflowSetting to undefined
    // so setOverflowHidden knows it can be set again.
    previousBodyOverflowSetting = undefined;
  }
};

// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
var isTargetElementTotallyScrolled = function isTargetElementTotallyScrolled(targetElement) {
  return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
};

var handleScroll = function handleScroll(event, targetElement) {
  var clientY = event.targetTouches[0].clientY - initialClientY;

  if (allowTouchMove(event.target)) {
    return false;
  }

  if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
    // element is at the top of its scroll.
    return preventDefault(event);
  }

  if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
    // element is at the bottom of its scroll.
    return preventDefault(event);
  }

  event.stopPropagation();
  return true;
};

var disableBodyScroll = function disableBodyScroll(targetElement, options) {
  // targetElement must be provided
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
    return;
  }

  // disableBodyScroll must not have been called on this targetElement before
  if (locks.some(function (lock) {
    return lock.targetElement === targetElement;
  })) {
    return;
  }

  var lock = {
    targetElement: targetElement,
    options: options || {}
  };

  locks = [].concat(_toConsumableArray(locks), [lock]);

  if (isIosDevice) {
    targetElement.ontouchstart = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        initialClientY = event.targetTouches[0].clientY;
      }
    };
    targetElement.ontouchmove = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        handleScroll(event, targetElement);
      }
    };

    if (!documentListenerAdded) {
      document.addEventListener('touchmove', preventDefault, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = true;
    }
  } else {
    setOverflowHidden(options);
  }
};

var enableBodyScroll = function enableBodyScroll(targetElement) {
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
    return;
  }

  locks = locks.filter(function (lock) {
    return lock.targetElement !== targetElement;
  });

  if (isIosDevice) {
    targetElement.ontouchstart = null;
    targetElement.ontouchmove = null;

    if (documentListenerAdded && locks.length === 0) {
      document.removeEventListener('touchmove', preventDefault, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = false;
    }
  } else if (!locks.length) {
    restoreOverflowSetting();
  }
};

var routes = window.theme.routes.cart || {};
var {
  strings: strings$3
} = window.theme;
var selectors$A = {
  productVariant: "[data-variant-select]",
  form: "[data-form]",
  country: "[data-address-country]",
  province: "[data-address-province]",
  provinceWrapper: "[data-address-province-wrapper]",
  zip: "[data-address-zip]",
  modal: "[data-estimator-modal]",
  wash: "[data-mobile-wash]",
  trigger: "[data-estimator-trigger]",
  estimateButton: "[data-estimator-button]",
  success: "[data-estimator-success]",
  error: "[data-estimator-error]",
  close: "[data-close-icon]"
};
var classes$b = {
  active: "active",
  hidden: "hidden",
  visible: "is-visible",
  fixed: "is-fixed"
};

var ShippingEstimator = (node, container) => {
  var form = n$3(selectors$A.form, node);
  var productSelect = n$3(selectors$A.productVariant, container);
  var countrySelector = n$3(selectors$A.country, node);
  var provinceSelector = n$3(selectors$A.province, node);
  var provinceWrapper = n$3(selectors$A.provinceWrapper, node);
  var zipInput = n$3(selectors$A.zip, node);
  var modal = n$3(selectors$A.modal, node);
  var wash = n$3(selectors$A.wash, node);
  var trigger = n$3(selectors$A.trigger, node);
  var estimate = n$3(selectors$A.estimateButton, node);
  var successMessage = n$3(selectors$A.success, node);
  var errorMessage = n$3(selectors$A.error, node);
  var focusTrap = null;
  var cartCookie; // Add dummy placeholder option

  var firstCountryOptions = t$6("option", countrySelector);

  if (firstCountryOptions.length > 1) {
    firstCountryOptions[0].setAttribute("selected", true);
    firstCountryOptions[0].innerText = strings$3.products.product.country_placeholder;
  }

  _checkForProvince();

  var events = [e$3(form, "submit", e => {
    e.preventDefault();

    _estimateShipping();
  }), e$3(countrySelector, "change", _checkForProvince), e$3(trigger, "click", _open), e$3(wash, "click", _close), e$3(n$3(selectors$A.close, node), "click", _close), e$3(estimate, "click", _estimateShipping), e$3(modal, "keydown", _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  })];
  /* get cookie by name */

  var getCookie = name => {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2) return parts.pop().split(";").shift();
  };
  /* update the cart cookie value */


  var updateCartCookie = a => {
    var date = new Date();
    date.setTime(date.getTime() + 14 * 86400000);
    var expires = "; expires=" + date.toGMTString();
    document.cookie = "cart=" + a + expires + "; path=/";
  };
  /* reset the cart cookie value */


  var resetCartCookie = () => {
    updateCartCookie(cartCookie);
  };
  /* get the rates */


  var getRates = variantId => {
    u$2(estimate, "loading");
    if (typeof variantId === "undefined") return;
    var productQuantity = n$3("[data-quantity-input]", container);
    var quantity = productQuantity ? parseInt(productQuantity.value) : 1;
    var addData = {
      id: variantId,
      quantity: quantity
    };
    fetch(routes.add + ".js", {
      body: JSON.stringify(addData),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "xmlhttprequest"
      },
      method: "POST"
    }).then(response => {
      return response.json();
    }).then(() => {
      errorMessage.innerHTML = "";
      successMessage.innerHTML = "";
      i$1(successMessage, "active");
      var countryQuery = "shipping_address%5Bcountry%5D=".concat(countrySelector.value);
      var provinceQuery = "shipping_address%5Bprovince%5D=".concat(provinceSelector.value);
      var zipQuery = "shipping_address%5Bzip%5D=".concat(zipInput.value);
      var requestUrl = "".concat(routes.shipping, ".json?").concat(countryQuery, "&").concat(provinceQuery, "&").concat(zipQuery);
      var request = new XMLHttpRequest();
      request.open("GET", requestUrl, true);

      request.onload = () => {
        var response = JSON.parse(request.response);

        if (request.status >= 200 && request.status < 300) {
          if (response.shipping_rates && response.shipping_rates.length) {
            u$2(successMessage, "active");
            response.shipping_rates.forEach(rate => {
              var rateElement = "\n                  <li class=\"shipping-estimator-modal__success-item\">\n                    <h4 class=\"ma0\">".concat(rate.name, "</h4>\n                    <span>").concat(formatMoney(rate.price), "</span>\n                  </li>\n                ");
              successMessage.insertAdjacentHTML("beforeend", rateElement);
            });
          } else {
            var noRate = "\n                <li class=\"shipping-estimator-modal__success-item\">\n                  <span>".concat(strings$3.products.product.no_shipping_rates, "</span>\n                </li>\n              ");
            successMessage.insertAdjacentHTML("beforeend", noRate);
          }
        } else {
          for (var [key, value] of Object.entries(response)) {
            var errorElement = "\n              <li class=\"shipping-estimator-modal__error-item\">\n                <div><span>".concat(key, "</span> ").concat(value, "</div>\n              </li>\n            ");
            errorMessage.insertAdjacentHTML("beforeend", errorElement);
          }
        }

        resetCartCookie();
        i$1(estimate, "loading");
      };

      request.send();
    }).catch(() => {
      resetCartCookie();
      i$1(estimate, "loading");
    });
  };

  function _checkForProvince() {
    var selected = n$3("[value=\"".concat(countrySelector.value, "\"]"), countrySelector);
    var provinces = JSON.parse(selected.dataset.provinces);
    l(provinceWrapper, classes$b.hidden, !provinces.length);
    provinceSelector.innerHTML = provinces.reduce((acc, curr) => {
      return acc + "<option value=\"".concat(curr[0], "\">").concat(curr[0], "</option>");
    }, "");
  }

  function _estimateShipping() {
    if (!productSelect.value.length) return;
    cartCookie = getCookie("cart");
    var tempCookieValue = "temp-cart-cookie___" + Date.now();
    var fakeCookieValue = "fake-cart-cookie___" + Date.now(); // If not found, make a new temp cookie

    if (!cartCookie) {
      updateCartCookie(tempCookieValue);
      cartCookie = getCookie("cart");
    } // If found but has a weird length, abort


    if (cartCookie.length < 32) return;
    /* Change the cookie value to a new 32 character value */

    updateCartCookie(fakeCookieValue);
    getRates(parseInt(productSelect.value));
  }

  function _open(e) {
    e.preventDefault();
    u$2(modal, classes$b.fixed);
    setTimeout(() => {
      u$2(modal, classes$b.visible, classes$b.active);
    }, 50);
    modal.setAttribute("aria-hidden", "false");
    focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    focusTrap.activate();
    disableBodyScroll(modal, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }

          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  }

  function _close(e) {
    e && e.preventDefault();
    i$1(modal, classes$b.visible, classes$b.active);
    focusTrap && focusTrap.deactivate();
    setTimeout(() => {
      i$1(modal, classes$b.fixed);
    }, 300);
    modal.setAttribute("aria-hidden", "true");
    enableBodyScroll(modal);
  }

  return () => {
    events.forEach(unsubscribe => unsubscribe());
  };
};

var {
  strings: {
    products: strings$2
  }
} = theme;
var classes$a = {
  hide: "hide"
};

var productForm = function productForm(formElement) {
  var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var {
    productHandle,
    ajaxEnabled
  } = formElement.dataset;
  var {
    product: selector
  } = selectors$1j;
  var storeAvailabilityContainer = formElement.querySelector(selector.storeAvailability);
  var shippingEstimatorButtons = t$6("[data-estimator-trigger]", config.container);
  var shippingEstimator = shippingEstimatorButtons.map(button => ShippingEstimator(button.parentNode, config.container));
  var thisInventoryCounter;

  var formSubmit = evt => {
    if (ajaxEnabled !== "true") return;
    evt.preventDefault();
    evt.dataset;
    var button = formElement.querySelector(selector.addButton);
    var quantityError = formElement.querySelector("[data-quantity-error]");
    button.classList.add("bttn--loading");

    if (quantityError) {
      quantityError.classList.add("hidden");
    }

    addItem(formElement).then(() => {
      button.classList.remove("bttn--loading");
      r$1("product:added");
    }).catch(() => {
      button.classList.remove("bttn--loading");

      if (quantityError) {
        quantityError.classList.remove("hidden");
      }
    });
  };

  var defaultConfig = {
    isProductPage: false,
    isFeaturedProduct: false,
    onOptionChange: e => optionChange(e),
    onQuantityChange: e => quantityChange(e),
    onFormSubmit: formSubmit,
    container: formElement
  };
  var {
    isProductPage,
    isFeaturedProduct,
    onOptionChange,
    onQuantityChange,
    onFormSubmit,
    container
  } = Object.assign(defaultConfig, config);
  var form = null;
  var availability = null;
  var product = getProduct(productHandle);
  product(data => {
    form = ProductForm(formElement, data, {
      variantSelector: "[data-variant-select]",
      onOptionChange,
      onQuantityChange,
      onFormSubmit
    });

    if (isProductPage) {
      updateRecentProducts(data);
    } // Surface pickup


    var variant = form.getVariant();

    if (storeAvailabilityContainer && variant) {
      availability = storeAvailability(storeAvailabilityContainer, data, variant);
    }

    var productInventoryJson = formElement.querySelector("[data-product-inventory-json]");

    if (productInventoryJson) {
      var jsonData = JSON.parse(productInventoryJson.innerHTML);
      var variantsInventories = jsonData.inventory;

      if (variantsInventories) {
        var _config = {
          id: variant.id,
          variantsInventories
        };
        thisInventoryCounter = inventoryCounter(formElement, _config);
      }
    }
  }); // When the user changes the quanitity

  function quantityChange(_ref) {
    var {
      dataset: {
        variant,
        quantity
      }
    } = _ref;
    dispatchCustomEvent(CustomEvents.productQuanityUpdate, {
      quantity: quantity,
      variant: variant
    });
  } // When the user changes a product option


  var optionChange = _ref2 => {
    var {
      dataset: {
        variant
      },
      target
    } = _ref2;
    // Update product option visable value. Essential for swatch/chips
    var optionSelectedLabel = n$3("[data-option-selected]", target.closest(".product-form__option"));
    if (optionSelectedLabel) optionSelectedLabel.innerHTML = target.value;
    dispatchCustomEvent(CustomEvents.productVariantChange, {
      variant: variant
    });

    if (thisInventoryCounter) {
      thisInventoryCounter && thisInventoryCounter.update(variant);
    }

    if (!variant) {
      updateBuyButton(formElement);
      updatePrices(variant);

      if (availability && storeAvailabilityContainer) {
        availability.unload();
      }

      shippingEstimatorButtons.forEach(btn => u$2(btn.parentNode, "hidden"));
      return;
    }

    if (isProductPage) {
      // Update URL with selected variant
      var url = getUrlWithVariant(window.location.href, variant.id);
      window.history.replaceState({
        path: url
      }, "", url);
    } // Update prices to reflect selected variant


    updatePrices(variant); // We need to set the id input manually so the Dynamic Checkout Button works

    var selectedVariantOpt = formElement.querySelector("".concat(selector.variantSelect, " ").concat(selector.optionById(variant.id)));
    selectedVariantOpt.selected = true; // We need to dispatch an event so Shopify pay knows the form has changed

    formElement.dispatchEvent(new Event("change")); // Update buy button to reflect selected variant

    updateBuyButton(formElement, variant); // Update unit pricing

    updateUnitPrices(container, variant); // Update sku

    updateSku(container, variant); // Scroll to variant media

    if (isProductPage && variant.featured_media) {
      if (window.matchMedia("(min-width: 60em)").matches) {
        var image = document.querySelector("[data-media-id=\"".concat(variant.featured_media.id, "\"]"));

        if (document.querySelector(".product-thumbnails")) {
          var thumb = document.querySelector("[data-thumbnail-id=\"".concat(variant.featured_media.id, "\"]"));
          var allThumbs = document.querySelectorAll(".product-thumbnails__item-link");
          var allImages = document.querySelectorAll(".media-wrapper");
          allThumbs.forEach(thumb => thumb.classList.remove("active"));
          allImages.forEach(image => image.classList.add("hidden"));
          image && image.classList.remove("hidden");
          thumb && thumb.classList.add("active");
        } else {
          image && image.scrollIntoView({
            behavior: "smooth"
          });
        }
      } else {
        r$1("product:mediaSelect", () => ({
          selectedMedia: variant.featured_media.position - 1
        }));
      }
    } // Show variant


    if (isFeaturedProduct && variant.featured_media) {
      var featureProductImages = container.querySelectorAll("[data-media-id]");
      featureProductImages.forEach(element => {
        element.classList.add("hidden");
      });

      var _image = container.querySelector("[data-media-id=\"".concat(variant.featured_media.id, "\"]"));

      _image.classList.remove("hidden");
    } // Update store availability


    if (availability && isFeaturedProduct || availability && isProductPage) {
      availability.update(variant);
    }

    shippingEstimatorButtons.forEach(btn => i$1(btn.parentNode, "hidden"));
  };

  var updatePrices = variant => {
    var target = container ? container : formElement;
    var price = target.querySelectorAll(selector.price);
    var comparePrice = target.querySelectorAll(selector.comparePrice);
    var unavailableString = strings$2.product.unavailable;

    if (!variant) {
      price.forEach(el => el.innerHTML = unavailableString);
      comparePrice.forEach(el => el.innerHTML = "");
      comparePrice.forEach(el => el.classList.add(classes$a.hide));
      return;
    }

    price.forEach(el => el.innerHTML = formatMoney(variant.price));

    if (variant.compare_at_price > variant.price) {
      comparePrice.forEach(el => el.innerHTML = formatMoney(variant.compare_at_price));
      comparePrice.forEach(el => el.classList.remove(classes$a.hide));
    } else {
      comparePrice.forEach(el => el.innerHTML = "");
      comparePrice.forEach(el => el.classList.add(classes$a.hide));
    }
  };

  var unload = () => {
    form.destroy();
    shippingEstimator.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
};

var selectors$z = {
  addToCart: "[data-add-to-cart]",
  price: "[data-price]",
  comparePrice: "[data-compare-price]",
  quickAddModal: "[data-quick-add-modal]",
  quickAddModalClose: "[data-quick-add-close]",
  quickAddModalInner: ".quick-add__inner",
  quickAddModalContent: ".quick-add__content",
  quickAddModalWash: ".quick-add__wash",
  quickAddProduct: ".quick-add__product-wrapper"
};
var classes$9 = {
  visible: "visible",
  hidden: "hidden",
  loaded: "loaded"
};

var getProductMarkup = handle => cb => fetch("".concat(window.theme.routes.products, "/").concat(encodeURIComponent(handle), "?section_id=quick-add-item")).then(res => res.text()).then(data => cb(data)).catch(err => console.log(err.message));

function quickAdd () {
  var quickAddModal = n$3(selectors$z.quickAddModal, document);
  var quickAddModalContent = n$3(selectors$z.quickAddModalContent, quickAddModal);
  var quickAddModalWash = n$3(selectors$z.quickAddModalWash, quickAddModal);
  var delegate = new Delegate(document.body);
  [e$3(quickAddModalWash, "click", close), e$3(n$3(selectors$z.quickAddModalClose, quickAddModal), "click", close), e$3(quickAddModal, "keydown", _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) close();
  }), c$1("product:added", () => close())];
  delegate.on("click", "button[data-quick-add]", handleClick);
  var focusTrap = createFocusTrap(n$3(selectors$z.quickAddModalInner, quickAddModal), {
    allowOutsideClick: true
  });
  var form, specialityVariantButtons, quanityInputEl, dynamicVariantAvailability;
  var quickAddAnimation = animateQuickAdd(quickAddModal);

  function handleClick(event, target) {
    event.preventDefault();
    var {
      quickAdd: handle
    } = target.dataset;
    open(handle);
  }

  function open(handle) {
    quickAddModalContent.innerHTML = "";
    u$2(quickAddModal, classes$9.visible);
    focusTrap.activate(); // Fetch markup and open quick add

    var product = getProductMarkup(handle);
    product(html => {
      var container = document.createElement("div");
      container.innerHTML = html;
      quickAddModalContent.innerHTML = n$3(selectors$z.quickAddProduct, container).innerHTML;
      form = productForm(n$3("form", quickAddModalContent), {
        isProductPage: false,
        container: quickAddModalContent
      });
      var quantityEl = n$3(".product-form__input", quickAddModalContent);

      if (quantityEl) {
        quanityInputEl = quantityInput(".product-form__quantity", quickAddModalContent);
      }

      specialityVariantButtons = OptionButtons(t$6("[data-option-buttons]", quickAddModalContent)); // Handle dynamic variant options

      dynamicVariantAvailability = variantAvailability(quickAddModalContent);
      dispatchCustomEvent(CustomEvents.quickViewLoaded);
      u$2(quickAddModal, classes$9.loaded);
      quickAddAnimation === null || quickAddAnimation === void 0 ? void 0 : quickAddAnimation.open();
    });
  }

  function close() {
    var _form, _quanityInputEl, _specialityVariantBut, _dynamicVariantAvaila;

    focusTrap.deactivate();
    i$1(quickAddModal, classes$9.loaded);
    i$1(quickAddModal, classes$9.visible);
    (_form = form) === null || _form === void 0 ? void 0 : _form.unload();
    (_quanityInputEl = quanityInputEl) === null || _quanityInputEl === void 0 ? void 0 : _quanityInputEl.quanityInputEl();
    (_specialityVariantBut = specialityVariantButtons) === null || _specialityVariantBut === void 0 ? void 0 : _specialityVariantBut.destroy();
    (_dynamicVariantAvaila = dynamicVariantAvailability) === null || _dynamicVariantAvaila === void 0 ? void 0 : _dynamicVariantAvaila.unload();
    quickAddAnimation === null || quickAddAnimation === void 0 ? void 0 : quickAddAnimation.close();
  }
}

var classes$8 = {
  visible: "is-visible"
};
var selectors$y = {
  closeBtn: "[data-store-availability-close]",
  productTitle: "[data-store-availability-product-title]",
  variantTitle: "[data-store-availability-variant-title]",
  productCard: "[data-store-availability-product]",
  storeListcontainer: "[data-store-list-container]"
};

var storeAvailabilityDrawer = node => {
  if (!node) return;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var productCard = n$3(selectors$y.productCard, node);
  var storeListContainer = n$3(selectors$y.storeListcontainer, node);
  var events = [e$3(n$3(selectors$y.closeBtn, node), "click", e => {
    e.preventDefault();

    _close();
  }), e$3(node, "keydown", _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  }), c$1("drawerOverlay:hiding", () => _close(false)), c$1("availability:showMore", _ref2 => {
    var {
      product,
      variant,
      storeList
    } = _ref2;
    productCard.innerHTML = _renderProductCard(product, variant);

    _renderAvailabilityList(storeList);

    _open();
  })];
  var storeAvailabilityAnimation = animateStoreAvailability(node);

  var _renderAvailabilityList = storeList => {
    storeListContainer.innerHTML = "";
    storeListContainer.appendChild(storeList);
    setTimeout(() => {
      storeAvailabilityAnimation === null || storeAvailabilityAnimation === void 0 ? void 0 : storeAvailabilityAnimation.setup();
    }, 10);
  };

  var _renderProductCard = (_ref3, _ref4) => {
    var {
      featured_image: image,
      title
    } = _ref3;
    var {
      title: variant_title,
      featured_image,
      price,
      unit_price,
      unit_price_measurement
    } = _ref4;

    var productImage = _getVariantImage(image, featured_image);

    return "\n      <div class=\"store-availability-flyout__product-card type-body-regular\">\n        ".concat(productImage ? "\n            <div class='store-availability-flyout__product-card-image'>\n              <img src='".concat(productImage, "' alt='").concat(title, "'/>\n            </div>\n          ") : "", "\n        <div class='store-availability-flyout__product-card-details'>\n          <div>\n            <h4 class=\"ma0\">\n              <span>").concat(title, "</span>\n            </h4>\n            <div class=\"store-availability-flyout__product-price-wrapper\">\n              <span class=\"store-availability-flyout__product-price\">").concat(formatMoney$1(price), "</span>\n              ").concat(renderUnitPrice(unit_price, unit_price_measurement), "\n            </div>\n            <div class=\"store-availability-flyout__product-card-options\">\n              ").concat(variant_title, "\n            </div>\n          </div>\n        </div>\n      </div>\n    ");
  };

  var _getVariantImage = (productImage, variantImage) => {
    if (!productImage && !variantImage) return "";

    if (variantImage) {
      return _updateImageSize(variantImage.src);
    }

    return _updateImageSize(productImage);
  };

  var _updateImageSize = imageUrl => {
    return getSizedImageUrl(imageUrl.replace("." + imageSize(imageUrl), ""), "200x");
  };

  var _open = () => {
    u$2(node, classes$8.visible);
    node.setAttribute("aria-hidden", "false");
    focusTrap.activate();
    r$1("drawerOverlay:show");
    setTimeout(() => {
      storeAvailabilityAnimation === null || storeAvailabilityAnimation === void 0 ? void 0 : storeAvailabilityAnimation.open();
    }, 10);
  };

  var _close = function _close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    focusTrap.deactivate();
    hideOverlay && r$1("drawerOverlay:hide");
    i$1(node, classes$8.visible);
    node.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      storeAvailabilityAnimation === null || storeAvailabilityAnimation === void 0 ? void 0 : storeAvailabilityAnimation.close();
    }, 10);
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload
  };
};

var ls_objectFit = {exports: {}};

var lazysizes = {exports: {}};

(function (module) {
(function(window, factory) {
	var lazySizes = factory(window, window.document, Date);
	window.lazySizes = lazySizes;
	if(module.exports){
		module.exports = lazySizes;
	}
}(typeof window != 'undefined' ?
      window : {}, 
/**
 * import("./types/global")
 * @typedef { import("./types/lazysizes-config").LazySizesConfigPartial } LazySizesConfigPartial
 */
function l(window, document, Date) { // Pass in the window Date function also for SSR because the Date class can be lost
	/*jshint eqnull:true */

	var lazysizes,
		/**
		 * @type { LazySizesConfigPartial }
		 */
		lazySizesCfg;

	(function(){
		var prop;

		var lazySizesDefaults = {
			lazyClass: 'lazyload',
			loadedClass: 'lazyloaded',
			loadingClass: 'lazyloading',
			preloadClass: 'lazypreload',
			errorClass: 'lazyerror',
			//strictClass: 'lazystrict',
			autosizesClass: 'lazyautosizes',
			fastLoadedClass: 'ls-is-cached',
			iframeLoadMode: 0,
			srcAttr: 'data-src',
			srcsetAttr: 'data-srcset',
			sizesAttr: 'data-sizes',
			//preloadAfterLoad: false,
			minSize: 40,
			customMedia: {},
			init: true,
			expFactor: 1.5,
			hFac: 0.8,
			loadMode: 2,
			loadHidden: true,
			ricTimeout: 0,
			throttleDelay: 125,
		};

		lazySizesCfg = window.lazySizesConfig || window.lazysizesConfig || {};

		for(prop in lazySizesDefaults){
			if(!(prop in lazySizesCfg)){
				lazySizesCfg[prop] = lazySizesDefaults[prop];
			}
		}
	})();

	if (!document || !document.getElementsByClassName) {
		return {
			init: function () {},
			/**
			 * @type { LazySizesConfigPartial }
			 */
			cfg: lazySizesCfg,
			/**
			 * @type { true }
			 */
			noSupport: true,
		};
	}

	var docElem = document.documentElement;

	var supportPicture = window.HTMLPictureElement;

	var _addEventListener = 'addEventListener';

	var _getAttribute = 'getAttribute';

	/**
	 * Update to bind to window because 'this' becomes null during SSR
	 * builds.
	 */
	var addEventListener = window[_addEventListener].bind(window);

	var setTimeout = window.setTimeout;

	var requestAnimationFrame = window.requestAnimationFrame || setTimeout;

	var requestIdleCallback = window.requestIdleCallback;

	var regPicture = /^picture$/i;

	var loadEvents = ['load', 'error', 'lazyincluded', '_lazyloaded'];

	var regClassCache = {};

	var forEach = Array.prototype.forEach;

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var hasClass = function(ele, cls) {
		if(!regClassCache[cls]){
			regClassCache[cls] = new RegExp('(\\s|^)'+cls+'(\\s|$)');
		}
		return regClassCache[cls].test(ele[_getAttribute]('class') || '') && regClassCache[cls];
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var addClass = function(ele, cls) {
		if (!hasClass(ele, cls)){
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').trim() + ' ' + cls);
		}
	};

	/**
	 * @param ele {Element}
	 * @param cls {string}
	 */
	var removeClass = function(ele, cls) {
		var reg;
		if ((reg = hasClass(ele,cls))) {
			ele.setAttribute('class', (ele[_getAttribute]('class') || '').replace(reg, ' '));
		}
	};

	var addRemoveLoadEvents = function(dom, fn, add){
		var action = add ? _addEventListener : 'removeEventListener';
		if(add){
			addRemoveLoadEvents(dom, fn);
		}
		loadEvents.forEach(function(evt){
			dom[action](evt, fn);
		});
	};

	/**
	 * @param elem { Element }
	 * @param name { string }
	 * @param detail { any }
	 * @param noBubbles { boolean }
	 * @param noCancelable { boolean }
	 * @returns { CustomEvent }
	 */
	var triggerEvent = function(elem, name, detail, noBubbles, noCancelable){
		var event = document.createEvent('Event');

		if(!detail){
			detail = {};
		}

		detail.instance = lazysizes;

		event.initEvent(name, !noBubbles, !noCancelable);

		event.detail = detail;

		elem.dispatchEvent(event);
		return event;
	};

	var updatePolyfill = function (el, full){
		var polyfill;
		if( !supportPicture && ( polyfill = (window.picturefill || lazySizesCfg.pf) ) ){
			if(full && full.src && !el[_getAttribute]('srcset')){
				el.setAttribute('srcset', full.src);
			}
			polyfill({reevaluate: true, elements: [el]});
		} else if(full && full.src){
			el.src = full.src;
		}
	};

	var getCSS = function (elem, style){
		return (getComputedStyle(elem, null) || {})[style];
	};

	/**
	 *
	 * @param elem { Element }
	 * @param parent { Element }
	 * @param [width] {number}
	 * @returns {number}
	 */
	var getWidth = function(elem, parent, width){
		width = width || elem.offsetWidth;

		while(width < lazySizesCfg.minSize && parent && !elem._lazysizesWidth){
			width =  parent.offsetWidth;
			parent = parent.parentNode;
		}

		return width;
	};

	var rAF = (function(){
		var running, waiting;
		var firstFns = [];
		var secondFns = [];
		var fns = firstFns;

		var run = function(){
			var runFns = fns;

			fns = firstFns.length ? secondFns : firstFns;

			running = true;
			waiting = false;

			while(runFns.length){
				runFns.shift()();
			}

			running = false;
		};

		var rafBatch = function(fn, queue){
			if(running && !queue){
				fn.apply(this, arguments);
			} else {
				fns.push(fn);

				if(!waiting){
					waiting = true;
					(document.hidden ? setTimeout : requestAnimationFrame)(run);
				}
			}
		};

		rafBatch._lsFlush = run;

		return rafBatch;
	})();

	var rAFIt = function(fn, simple){
		return simple ?
			function() {
				rAF(fn);
			} :
			function(){
				var that = this;
				var args = arguments;
				rAF(function(){
					fn.apply(that, args);
				});
			}
		;
	};

	var throttle = function(fn){
		var running;
		var lastTime = 0;
		var gDelay = lazySizesCfg.throttleDelay;
		var rICTimeout = lazySizesCfg.ricTimeout;
		var run = function(){
			running = false;
			lastTime = Date.now();
			fn();
		};
		var idleCallback = requestIdleCallback && rICTimeout > 49 ?
			function(){
				requestIdleCallback(run, {timeout: rICTimeout});

				if(rICTimeout !== lazySizesCfg.ricTimeout){
					rICTimeout = lazySizesCfg.ricTimeout;
				}
			} :
			rAFIt(function(){
				setTimeout(run);
			}, true)
		;

		return function(isPriority){
			var delay;

			if((isPriority = isPriority === true)){
				rICTimeout = 33;
			}

			if(running){
				return;
			}

			running =  true;

			delay = gDelay - (Date.now() - lastTime);

			if(delay < 0){
				delay = 0;
			}

			if(isPriority || delay < 9){
				idleCallback();
			} else {
				setTimeout(idleCallback, delay);
			}
		};
	};

	//based on http://modernjavascript.blogspot.de/2013/08/building-better-debounce.html
	var debounce = function(func) {
		var timeout, timestamp;
		var wait = 99;
		var run = function(){
			timeout = null;
			func();
		};
		var later = function() {
			var last = Date.now() - timestamp;

			if (last < wait) {
				setTimeout(later, wait - last);
			} else {
				(requestIdleCallback || run)(run);
			}
		};

		return function() {
			timestamp = Date.now();

			if (!timeout) {
				timeout = setTimeout(later, wait);
			}
		};
	};

	var loader = (function(){
		var preloadElems, isCompleted, resetPreloadingTimer, loadMode, started;

		var eLvW, elvH, eLtop, eLleft, eLright, eLbottom, isBodyHidden;

		var regImg = /^img$/i;
		var regIframe = /^iframe$/i;

		var supportScroll = ('onscroll' in window) && !(/(gle|ing)bot/.test(navigator.userAgent));

		var shrinkExpand = 0;
		var currentExpand = 0;

		var isLoading = 0;
		var lowRuns = -1;

		var resetPreloading = function(e){
			isLoading--;
			if(!e || isLoading < 0 || !e.target){
				isLoading = 0;
			}
		};

		var isVisible = function (elem) {
			if (isBodyHidden == null) {
				isBodyHidden = getCSS(document.body, 'visibility') == 'hidden';
			}

			return isBodyHidden || !(getCSS(elem.parentNode, 'visibility') == 'hidden' && getCSS(elem, 'visibility') == 'hidden');
		};

		var isNestedVisible = function(elem, elemExpand){
			var outerRect;
			var parent = elem;
			var visible = isVisible(elem);

			eLtop -= elemExpand;
			eLbottom += elemExpand;
			eLleft -= elemExpand;
			eLright += elemExpand;

			while(visible && (parent = parent.offsetParent) && parent != document.body && parent != docElem){
				visible = ((getCSS(parent, 'opacity') || 1) > 0);

				if(visible && getCSS(parent, 'overflow') != 'visible'){
					outerRect = parent.getBoundingClientRect();
					visible = eLright > outerRect.left &&
						eLleft < outerRect.right &&
						eLbottom > outerRect.top - 1 &&
						eLtop < outerRect.bottom + 1
					;
				}
			}

			return visible;
		};

		var checkElements = function() {
			var eLlen, i, rect, autoLoadElem, loadedSomething, elemExpand, elemNegativeExpand, elemExpandVal,
				beforeExpandVal, defaultExpand, preloadExpand, hFac;
			var lazyloadElems = lazysizes.elements;

			if((loadMode = lazySizesCfg.loadMode) && isLoading < 8 && (eLlen = lazyloadElems.length)){

				i = 0;

				lowRuns++;

				for(; i < eLlen; i++){

					if(!lazyloadElems[i] || lazyloadElems[i]._lazyRace){continue;}

					if(!supportScroll || (lazysizes.prematureUnveil && lazysizes.prematureUnveil(lazyloadElems[i]))){unveilElement(lazyloadElems[i]);continue;}

					if(!(elemExpandVal = lazyloadElems[i][_getAttribute]('data-expand')) || !(elemExpand = elemExpandVal * 1)){
						elemExpand = currentExpand;
					}

					if (!defaultExpand) {
						defaultExpand = (!lazySizesCfg.expand || lazySizesCfg.expand < 1) ?
							docElem.clientHeight > 500 && docElem.clientWidth > 500 ? 500 : 370 :
							lazySizesCfg.expand;

						lazysizes._defEx = defaultExpand;

						preloadExpand = defaultExpand * lazySizesCfg.expFactor;
						hFac = lazySizesCfg.hFac;
						isBodyHidden = null;

						if(currentExpand < preloadExpand && isLoading < 1 && lowRuns > 2 && loadMode > 2 && !document.hidden){
							currentExpand = preloadExpand;
							lowRuns = 0;
						} else if(loadMode > 1 && lowRuns > 1 && isLoading < 6){
							currentExpand = defaultExpand;
						} else {
							currentExpand = shrinkExpand;
						}
					}

					if(beforeExpandVal !== elemExpand){
						eLvW = innerWidth + (elemExpand * hFac);
						elvH = innerHeight + elemExpand;
						elemNegativeExpand = elemExpand * -1;
						beforeExpandVal = elemExpand;
					}

					rect = lazyloadElems[i].getBoundingClientRect();

					if ((eLbottom = rect.bottom) >= elemNegativeExpand &&
						(eLtop = rect.top) <= elvH &&
						(eLright = rect.right) >= elemNegativeExpand * hFac &&
						(eLleft = rect.left) <= eLvW &&
						(eLbottom || eLright || eLleft || eLtop) &&
						(lazySizesCfg.loadHidden || isVisible(lazyloadElems[i])) &&
						((isCompleted && isLoading < 3 && !elemExpandVal && (loadMode < 3 || lowRuns < 4)) || isNestedVisible(lazyloadElems[i], elemExpand))){
						unveilElement(lazyloadElems[i]);
						loadedSomething = true;
						if(isLoading > 9){break;}
					} else if(!loadedSomething && isCompleted && !autoLoadElem &&
						isLoading < 4 && lowRuns < 4 && loadMode > 2 &&
						(preloadElems[0] || lazySizesCfg.preloadAfterLoad) &&
						(preloadElems[0] || (!elemExpandVal && ((eLbottom || eLright || eLleft || eLtop) || lazyloadElems[i][_getAttribute](lazySizesCfg.sizesAttr) != 'auto')))){
						autoLoadElem = preloadElems[0] || lazyloadElems[i];
					}
				}

				if(autoLoadElem && !loadedSomething){
					unveilElement(autoLoadElem);
				}
			}
		};

		var throttledCheckElements = throttle(checkElements);

		var switchLoadingClass = function(e){
			var elem = e.target;

			if (elem._lazyCache) {
				delete elem._lazyCache;
				return;
			}

			resetPreloading(e);
			addClass(elem, lazySizesCfg.loadedClass);
			removeClass(elem, lazySizesCfg.loadingClass);
			addRemoveLoadEvents(elem, rafSwitchLoadingClass);
			triggerEvent(elem, 'lazyloaded');
		};
		var rafedSwitchLoadingClass = rAFIt(switchLoadingClass);
		var rafSwitchLoadingClass = function(e){
			rafedSwitchLoadingClass({target: e.target});
		};

		var changeIframeSrc = function(elem, src){
			var loadMode = elem.getAttribute('data-load-mode') || lazySizesCfg.iframeLoadMode;

			// loadMode can be also a string!
			if (loadMode == 0) {
				elem.contentWindow.location.replace(src);
			} else if (loadMode == 1) {
				elem.src = src;
			}
		};

		var handleSources = function(source){
			var customMedia;

			var sourceSrcset = source[_getAttribute](lazySizesCfg.srcsetAttr);

			if( (customMedia = lazySizesCfg.customMedia[source[_getAttribute]('data-media') || source[_getAttribute]('media')]) ){
				source.setAttribute('media', customMedia);
			}

			if(sourceSrcset){
				source.setAttribute('srcset', sourceSrcset);
			}
		};

		var lazyUnveil = rAFIt(function (elem, detail, isAuto, sizes, isImg){
			var src, srcset, parent, isPicture, event, firesLoad;

			if(!(event = triggerEvent(elem, 'lazybeforeunveil', detail)).defaultPrevented){

				if(sizes){
					if(isAuto){
						addClass(elem, lazySizesCfg.autosizesClass);
					} else {
						elem.setAttribute('sizes', sizes);
					}
				}

				srcset = elem[_getAttribute](lazySizesCfg.srcsetAttr);
				src = elem[_getAttribute](lazySizesCfg.srcAttr);

				if(isImg) {
					parent = elem.parentNode;
					isPicture = parent && regPicture.test(parent.nodeName || '');
				}

				firesLoad = detail.firesLoad || (('src' in elem) && (srcset || src || isPicture));

				event = {target: elem};

				addClass(elem, lazySizesCfg.loadingClass);

				if(firesLoad){
					clearTimeout(resetPreloadingTimer);
					resetPreloadingTimer = setTimeout(resetPreloading, 2500);
					addRemoveLoadEvents(elem, rafSwitchLoadingClass, true);
				}

				if(isPicture){
					forEach.call(parent.getElementsByTagName('source'), handleSources);
				}

				if(srcset){
					elem.setAttribute('srcset', srcset);
				} else if(src && !isPicture){
					if(regIframe.test(elem.nodeName)){
						changeIframeSrc(elem, src);
					} else {
						elem.src = src;
					}
				}

				if(isImg && (srcset || isPicture)){
					updatePolyfill(elem, {src: src});
				}
			}

			if(elem._lazyRace){
				delete elem._lazyRace;
			}
			removeClass(elem, lazySizesCfg.lazyClass);

			rAF(function(){
				// Part of this can be removed as soon as this fix is older: https://bugs.chromium.org/p/chromium/issues/detail?id=7731 (2015)
				var isLoaded = elem.complete && elem.naturalWidth > 1;

				if( !firesLoad || isLoaded){
					if (isLoaded) {
						addClass(elem, lazySizesCfg.fastLoadedClass);
					}
					switchLoadingClass(event);
					elem._lazyCache = true;
					setTimeout(function(){
						if ('_lazyCache' in elem) {
							delete elem._lazyCache;
						}
					}, 9);
				}
				if (elem.loading == 'lazy') {
					isLoading--;
				}
			}, true);
		});

		/**
		 *
		 * @param elem { Element }
		 */
		var unveilElement = function (elem){
			if (elem._lazyRace) {return;}
			var detail;

			var isImg = regImg.test(elem.nodeName);

			//allow using sizes="auto", but don't use. it's invalid. Use data-sizes="auto" or a valid value for sizes instead (i.e.: sizes="80vw")
			var sizes = isImg && (elem[_getAttribute](lazySizesCfg.sizesAttr) || elem[_getAttribute]('sizes'));
			var isAuto = sizes == 'auto';

			if( (isAuto || !isCompleted) && isImg && (elem[_getAttribute]('src') || elem.srcset) && !elem.complete && !hasClass(elem, lazySizesCfg.errorClass) && hasClass(elem, lazySizesCfg.lazyClass)){return;}

			detail = triggerEvent(elem, 'lazyunveilread').detail;

			if(isAuto){
				 autoSizer.updateElem(elem, true, elem.offsetWidth);
			}

			elem._lazyRace = true;
			isLoading++;

			lazyUnveil(elem, detail, isAuto, sizes, isImg);
		};

		var afterScroll = debounce(function(){
			lazySizesCfg.loadMode = 3;
			throttledCheckElements();
		});

		var altLoadmodeScrollListner = function(){
			if(lazySizesCfg.loadMode == 3){
				lazySizesCfg.loadMode = 2;
			}
			afterScroll();
		};

		var onload = function(){
			if(isCompleted){return;}
			if(Date.now() - started < 999){
				setTimeout(onload, 999);
				return;
			}


			isCompleted = true;

			lazySizesCfg.loadMode = 3;

			throttledCheckElements();

			addEventListener('scroll', altLoadmodeScrollListner, true);
		};

		return {
			_: function(){
				started = Date.now();

				lazysizes.elements = document.getElementsByClassName(lazySizesCfg.lazyClass);
				preloadElems = document.getElementsByClassName(lazySizesCfg.lazyClass + ' ' + lazySizesCfg.preloadClass);

				addEventListener('scroll', throttledCheckElements, true);

				addEventListener('resize', throttledCheckElements, true);

				addEventListener('pageshow', function (e) {
					if (e.persisted) {
						var loadingElements = document.querySelectorAll('.' + lazySizesCfg.loadingClass);

						if (loadingElements.length && loadingElements.forEach) {
							requestAnimationFrame(function () {
								loadingElements.forEach( function (img) {
									if (img.complete) {
										unveilElement(img);
									}
								});
							});
						}
					}
				});

				if(window.MutationObserver){
					new MutationObserver( throttledCheckElements ).observe( docElem, {childList: true, subtree: true, attributes: true} );
				} else {
					docElem[_addEventListener]('DOMNodeInserted', throttledCheckElements, true);
					docElem[_addEventListener]('DOMAttrModified', throttledCheckElements, true);
					setInterval(throttledCheckElements, 999);
				}

				addEventListener('hashchange', throttledCheckElements, true);

				//, 'fullscreenchange'
				['focus', 'mouseover', 'click', 'load', 'transitionend', 'animationend'].forEach(function(name){
					document[_addEventListener](name, throttledCheckElements, true);
				});

				if((/d$|^c/.test(document.readyState))){
					onload();
				} else {
					addEventListener('load', onload);
					document[_addEventListener]('DOMContentLoaded', throttledCheckElements);
					setTimeout(onload, 20000);
				}

				if(lazysizes.elements.length){
					checkElements();
					rAF._lsFlush();
				} else {
					throttledCheckElements();
				}
			},
			checkElems: throttledCheckElements,
			unveil: unveilElement,
			_aLSL: altLoadmodeScrollListner,
		};
	})();


	var autoSizer = (function(){
		var autosizesElems;

		var sizeElement = rAFIt(function(elem, parent, event, width){
			var sources, i, len;
			elem._lazysizesWidth = width;
			width += 'px';

			elem.setAttribute('sizes', width);

			if(regPicture.test(parent.nodeName || '')){
				sources = parent.getElementsByTagName('source');
				for(i = 0, len = sources.length; i < len; i++){
					sources[i].setAttribute('sizes', width);
				}
			}

			if(!event.detail.dataAttr){
				updatePolyfill(elem, event.detail);
			}
		});
		/**
		 *
		 * @param elem {Element}
		 * @param dataAttr
		 * @param [width] { number }
		 */
		var getSizeElement = function (elem, dataAttr, width){
			var event;
			var parent = elem.parentNode;

			if(parent){
				width = getWidth(elem, parent, width);
				event = triggerEvent(elem, 'lazybeforesizes', {width: width, dataAttr: !!dataAttr});

				if(!event.defaultPrevented){
					width = event.detail.width;

					if(width && width !== elem._lazysizesWidth){
						sizeElement(elem, parent, event, width);
					}
				}
			}
		};

		var updateElementsSizes = function(){
			var i;
			var len = autosizesElems.length;
			if(len){
				i = 0;

				for(; i < len; i++){
					getSizeElement(autosizesElems[i]);
				}
			}
		};

		var debouncedUpdateElementsSizes = debounce(updateElementsSizes);

		return {
			_: function(){
				autosizesElems = document.getElementsByClassName(lazySizesCfg.autosizesClass);
				addEventListener('resize', debouncedUpdateElementsSizes);
			},
			checkElems: debouncedUpdateElementsSizes,
			updateElem: getSizeElement
		};
	})();

	var init = function(){
		if(!init.i && document.getElementsByClassName){
			init.i = true;
			autoSizer._();
			loader._();
		}
	};

	setTimeout(function(){
		if(lazySizesCfg.init){
			init();
		}
	});

	lazysizes = {
		/**
		 * @type { LazySizesConfigPartial }
		 */
		cfg: lazySizesCfg,
		autoSizer: autoSizer,
		loader: loader,
		init: init,
		uP: updatePolyfill,
		aC: addClass,
		rC: removeClass,
		hC: hasClass,
		fire: triggerEvent,
		gW: getWidth,
		rAF: rAF,
	};

	return lazysizes;
}
));
}(lazysizes));

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(initialEvent){
		factory(window.lazySizes, initialEvent);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes, initialEvent) {
	var cloneElementClass;
	var style = document.createElement('a').style;
	var fitSupport = 'objectFit' in style;
	var positionSupport = fitSupport && 'objectPosition' in style;
	var regCssFit = /object-fit["']*\s*:\s*["']*(contain|cover)/;
	var regCssPosition = /object-position["']*\s*:\s*["']*(.+?)(?=($|,|'|"|;))/;
	var blankSrc = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
	var regBgUrlEscape = /\(|\)|'/;
	var positionDefaults = {
		center: 'center',
		'50% 50%': 'center',
	};

	function getObject(element){
		var css = (getComputedStyle(element, null) || {});
		var content = css.fontFamily || '';
		var objectFit = content.match(regCssFit) || '';
		var objectPosition = objectFit && content.match(regCssPosition) || '';

		if(objectPosition){
			objectPosition = objectPosition[1];
		}

		return {
			fit: objectFit && objectFit[1] || '',
			position: positionDefaults[objectPosition] || objectPosition || 'center',
		};
	}

	function generateStyleClass() {
		if (cloneElementClass) {
			return;
		}

		var styleElement = document.createElement('style');

		cloneElementClass = lazySizes.cfg.objectFitClass || 'lazysizes-display-clone';

		document.querySelector('head').appendChild(styleElement);
	}

	function removePrevClone(element) {
		var prev = element.previousElementSibling;

		if (prev && lazySizes.hC(prev, cloneElementClass)) {
			prev.parentNode.removeChild(prev);
			element.style.position = prev.getAttribute('data-position') || '';
			element.style.visibility = prev.getAttribute('data-visibility') || '';
		}
	}

	function initFix(element, config){
		var switchClassesAdded, addedSrc, styleElement, styleElementStyle;
		var lazysizesCfg = lazySizes.cfg;

		var onChange = function(){
			var src = element.currentSrc || element.src;

			if(src && addedSrc !== src){
				addedSrc = src;
				styleElementStyle.backgroundImage = 'url(' + (regBgUrlEscape.test(src) ? JSON.stringify(src) : src ) + ')';

				if(!switchClassesAdded){
					switchClassesAdded = true;
					lazySizes.rC(styleElement, lazysizesCfg.loadingClass);
					lazySizes.aC(styleElement, lazysizesCfg.loadedClass);
				}
			}
		};
		var rafedOnChange = function(){
			lazySizes.rAF(onChange);
		};

		element._lazysizesParentFit = config.fit;

		element.addEventListener('lazyloaded', rafedOnChange, true);
		element.addEventListener('load', rafedOnChange, true);

		lazySizes.rAF(function(){

			var hideElement = element;
			var container = element.parentNode;

			if(container.nodeName.toUpperCase() == 'PICTURE'){
				hideElement = container;
				container = container.parentNode;
			}

			removePrevClone(hideElement);

			if (!cloneElementClass) {
				generateStyleClass();
			}

			styleElement = element.cloneNode(false);
			styleElementStyle = styleElement.style;

			styleElement.addEventListener('load', function(){
				var curSrc = styleElement.currentSrc || styleElement.src;

				if(curSrc && curSrc != blankSrc){
					styleElement.src = blankSrc;
					styleElement.srcset = '';
				}
			});

			lazySizes.rC(styleElement, lazysizesCfg.loadedClass);
			lazySizes.rC(styleElement, lazysizesCfg.lazyClass);
			lazySizes.rC(styleElement, lazysizesCfg.autosizesClass);
			lazySizes.aC(styleElement, lazysizesCfg.loadingClass);
			lazySizes.aC(styleElement, cloneElementClass);

			['data-parent-fit', 'data-parent-container', 'data-object-fit-polyfilled',
				lazysizesCfg.srcsetAttr, lazysizesCfg.srcAttr].forEach(function(attr) {
				styleElement.removeAttribute(attr);
			});

			styleElement.src = blankSrc;
			styleElement.srcset = '';

			styleElementStyle.backgroundRepeat = 'no-repeat';
			styleElementStyle.backgroundPosition = config.position;
			styleElementStyle.backgroundSize = config.fit;

			styleElement.setAttribute('data-position', hideElement.style.position);
			styleElement.setAttribute('data-visibility', hideElement.style.visibility);

			hideElement.style.visibility = 'hidden';
			hideElement.style.position = 'absolute';

			element.setAttribute('data-parent-fit', config.fit);
			element.setAttribute('data-parent-container', 'prev');
			element.setAttribute('data-object-fit-polyfilled', '');
			element._objectFitPolyfilledDisplay = styleElement;

			container.insertBefore(styleElement, hideElement);

			if(element._lazysizesParentFit){
				delete element._lazysizesParentFit;
			}

			if(element.complete){
				onChange();
			}
		});
	}

	if(!fitSupport || !positionSupport){
		var onRead = function(e){
			if(e.detail.instance != lazySizes){return;}

			var element = e.target;
			var obj = getObject(element);

			if(obj.fit && (!fitSupport || (obj.position != 'center'))){
				initFix(element, obj);
				return true;
			}

			return false;
		};

		window.addEventListener('lazybeforesizes', function(e) {
			if(e.detail.instance != lazySizes){return;}
			var element = e.target;

			if (element.getAttribute('data-object-fit-polyfilled') != null && !element._objectFitPolyfilledDisplay) {
				if(!onRead(e)){
					lazySizes.rAF(function () {
						element.removeAttribute('data-object-fit-polyfilled');
					});
				}
			}
		});
		window.addEventListener('lazyunveilread', onRead, true);

		if(initialEvent && initialEvent.detail){
			onRead(initialEvent);
		}
	}
}));
}(ls_objectFit));

var ls_parentFit = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {

	if(!window.addEventListener){return;}

	var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
	var regCssFit = /parent-fit["']*\s*:\s*["']*(contain|cover|width)/;
	var regCssObject = /parent-container["']*\s*:\s*["']*(.+?)(?=(\s|$|,|'|"|;))/;
	var regPicture = /^picture$/i;
	var cfg = lazySizes.cfg;

	var getCSS = function (elem){
		return (getComputedStyle(elem, null) || {});
	};

	var parentFit = {

		getParent: function(element, parentSel){
			var parent = element;
			var parentNode = element.parentNode;

			if((!parentSel || parentSel == 'prev') && parentNode && regPicture.test(parentNode.nodeName || '')){
				parentNode = parentNode.parentNode;
			}

			if(parentSel != 'self'){
				if(parentSel == 'prev'){
					parent = element.previousElementSibling;
				} else if(parentSel && (parentNode.closest || window.jQuery)){
					parent = (parentNode.closest ?
							parentNode.closest(parentSel) :
							jQuery(parentNode).closest(parentSel)[0]) ||
						parentNode
					;
				} else {
					parent = parentNode;
				}
			}

			return parent;
		},

		getFit: function(element){
			var tmpMatch, parentObj;
			var css = getCSS(element);
			var content = css.content || css.fontFamily;
			var obj = {
				fit: element._lazysizesParentFit || element.getAttribute('data-parent-fit')
			};

			if(!obj.fit && content && (tmpMatch = content.match(regCssFit))){
				obj.fit = tmpMatch[1];
			}

			if(obj.fit){
				parentObj = element._lazysizesParentContainer || element.getAttribute('data-parent-container');

				if(!parentObj && content && (tmpMatch = content.match(regCssObject))){
					parentObj = tmpMatch[1];
				}

				obj.parent = parentFit.getParent(element, parentObj);


			} else {
				obj.fit = css.objectFit;
			}

			return obj;
		},

		getImageRatio: function(element){
			var i, srcset, media, ratio, match, width, height;
			var parent = element.parentNode;
			var elements = parent && regPicture.test(parent.nodeName || '') ?
					parent.querySelectorAll('source, img') :
					[element]
				;

			for(i = 0; i < elements.length; i++){
				element = elements[i];
				srcset = element.getAttribute(cfg.srcsetAttr) || element.getAttribute('srcset') || element.getAttribute('data-pfsrcset') || element.getAttribute('data-risrcset') || '';
				media = element._lsMedia || element.getAttribute('media');
				media = cfg.customMedia[element.getAttribute('data-media') || media] || media;

				if(srcset && (!media || (window.matchMedia && matchMedia(media) || {}).matches )){
					ratio = parseFloat(element.getAttribute('data-aspectratio'));

					if (!ratio) {
						match = srcset.match(regDescriptors);

						if (match) {
							if(match[2] == 'w'){
								width = match[1];
								height = match[3];
							} else {
								width = match[3];
								height = match[1];
							}
						} else {
							width = element.getAttribute('width');
							height = element.getAttribute('height');
						}

						ratio = width / height;
					}

					break;
				}
			}

			return ratio;
		},

		calculateSize: function(element, width){
			var displayRatio, height, imageRatio, retWidth;
			var fitObj = this.getFit(element);
			var fit = fitObj.fit;
			var fitElem = fitObj.parent;

			if(fit != 'width' && ((fit != 'contain' && fit != 'cover') || !(imageRatio = this.getImageRatio(element)))){
				return width;
			}

			if(fitElem){
				width = fitElem.clientWidth;
			} else {
				fitElem = element;
			}

			retWidth = width;

			if(fit == 'width'){
				retWidth = width;
			} else {
				height = fitElem.clientHeight;

				if((displayRatio =  width / height) && ((fit == 'cover' && displayRatio < imageRatio) || (fit == 'contain' && displayRatio > imageRatio))){
					retWidth = width * (imageRatio / displayRatio);
				}
			}

			return retWidth;
		}
	};

	lazySizes.parentFit = parentFit;

	document.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || e.detail.instance != lazySizes){return;}

		var element = e.target;
		e.detail.width = parentFit.calculateSize(element, e.detail.width);
	});
}));
}(ls_parentFit));

var ls_rias = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {

	var config, riasCfg;
	var lazySizesCfg = lazySizes.cfg;
	var replaceTypes = {string: 1, number: 1};
	var regNumber = /^\-*\+*\d+\.*\d*$/;
	var regPicture = /^picture$/i;
	var regWidth = /\s*\{\s*width\s*\}\s*/i;
	var regHeight = /\s*\{\s*height\s*\}\s*/i;
	var regPlaceholder = /\s*\{\s*([a-z0-9]+)\s*\}\s*/ig;
	var regObj = /^\[.*\]|\{.*\}$/;
	var regAllowedSizes = /^(?:auto|\d+(px)?)$/;
	var anchor = document.createElement('a');
	var img = document.createElement('img');
	var buggySizes = ('srcset' in img) && !('sizes' in img);
	var supportPicture = !!window.HTMLPictureElement && !buggySizes;

	(function(){
		var prop;
		var noop = function(){};
		var riasDefaults = {
			prefix: '',
			postfix: '',
			srcAttr: 'data-src',
			absUrl: false,
			modifyOptions: noop,
			widthmap: {},
			ratio: false,
			traditionalRatio: false,
			aspectratio: false,
		};

		config = lazySizes && lazySizes.cfg;

		if(!config.supportsType){
			config.supportsType = function(type/*, elem*/){
				return !type;
			};
		}

		if(!config.rias){
			config.rias = {};
		}
		riasCfg = config.rias;

		if(!('widths' in riasCfg)){
			riasCfg.widths = [];
			(function (widths){
				var width;
				var i = 0;
				while(!width || width < 3000){
					i += 5;
					if(i > 30){
						i += 1;
					}
					width = (36 * i);
					widths.push(width);
				}
			})(riasCfg.widths);
		}

		for(prop in riasDefaults){
			if(!(prop in riasCfg)){
				riasCfg[prop] = riasDefaults[prop];
			}
		}
	})();

	function getElementOptions(elem, src, options){
		var attr, parent, setOption, prop, opts;
		var elemStyles = window.getComputedStyle(elem);

		if (!options) {
			parent = elem.parentNode;

			options = {
				isPicture: !!(parent && regPicture.test(parent.nodeName || ''))
			};
		} else {
			opts = {};

			for (prop in options) {
				opts[prop] = options[prop];
			}

			options = opts;
		}

		setOption = function(attr, run){
			var attrVal = elem.getAttribute('data-'+ attr);

			if (!attrVal) {
				// no data- attr, get value from the CSS
				var styles = elemStyles.getPropertyValue('--ls-' + attr);
				// at least Safari 9 returns null rather than
				// an empty string for getPropertyValue causing
				// .trim() to fail
				if (styles) {
					attrVal = styles.trim();
				}
			}

			if (attrVal) {
				if(attrVal == 'true'){
					attrVal = true;
				} else if(attrVal == 'false'){
					attrVal = false;
				} else if(regNumber.test(attrVal)){
					attrVal = parseFloat(attrVal);
				} else if(typeof riasCfg[attr] == 'function'){
					attrVal = riasCfg[attr](elem, attrVal);
				} else if(regObj.test(attrVal)){
					try {
						attrVal = JSON.parse(attrVal);
					} catch(e){}
				}
				options[attr] = attrVal;
			} else if((attr in riasCfg) && typeof riasCfg[attr] != 'function' && !options[attr]){
				options[attr] = riasCfg[attr];
			} else if(run && typeof riasCfg[attr] == 'function'){
				options[attr] = riasCfg[attr](elem, attrVal);
			}
		};

		for(attr in riasCfg){
			setOption(attr);
		}
		src.replace(regPlaceholder, function(full, match){
			if(!(match in options)){
				setOption(match, true);
			}
		});

		return options;
	}

	function replaceUrlProps(url, options){
		var candidates = [];
		var replaceFn = function(full, match){
			return (replaceTypes[typeof options[match]]) ? options[match] : full;
		};
		candidates.srcset = [];

		if(options.absUrl){
			anchor.setAttribute('href', url);
			url = anchor.href;
		}

		url = ((options.prefix || '') + url + (options.postfix || '')).replace(regPlaceholder, replaceFn);

		options.widths.forEach(function(width){
			var widthAlias = options.widthmap[width] || width;
			var ratio = options.aspectratio || options.ratio;
			var traditionalRatio = !options.aspectratio && riasCfg.traditionalRatio;
			var candidate = {
				u: url.replace(regWidth, widthAlias)
						.replace(regHeight, ratio ?
							traditionalRatio ?
								Math.round(width * ratio) :
								Math.round(width / ratio)
							: ''),
				w: width
			};

			candidates.push(candidate);
			candidates.srcset.push( (candidate.c = candidate.u + ' ' + width + 'w') );
		});
		return candidates;
	}

	function setSrc(src, opts, elem){
		var elemW = 0;
		var elemH = 0;
		var sizeElement = elem;

		if(!src){return;}

		if (opts.ratio === 'container') {
			// calculate image or parent ratio
			elemW = sizeElement.scrollWidth;
			elemH = sizeElement.scrollHeight;

			while ((!elemW || !elemH) && sizeElement !== document) {
				sizeElement = sizeElement.parentNode;
				elemW = sizeElement.scrollWidth;
				elemH = sizeElement.scrollHeight;
			}
			if (elemW && elemH) {
				opts.ratio = opts.traditionalRatio ? elemH / elemW : elemW / elemH;
			}
		}

		src = replaceUrlProps(src, opts);

		src.isPicture = opts.isPicture;

		if(buggySizes && elem.nodeName.toUpperCase() == 'IMG'){
			elem.removeAttribute(config.srcsetAttr);
		} else {
			elem.setAttribute(config.srcsetAttr, src.srcset.join(', '));
		}

		Object.defineProperty(elem, '_lazyrias', {
			value: src,
			writable: true
		});
	}

	function createAttrObject(elem, src){
		var opts = getElementOptions(elem, src);

		riasCfg.modifyOptions.call(elem, {target: elem, details: opts, detail: opts});

		lazySizes.fire(elem, 'lazyriasmodifyoptions', opts);
		return opts;
	}

	function getSrc(elem){
		return elem.getAttribute( elem.getAttribute('data-srcattr') || riasCfg.srcAttr ) || elem.getAttribute(config.srcsetAttr) || elem.getAttribute(config.srcAttr) || elem.getAttribute('data-pfsrcset') || '';
	}

	addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}

		var elem, src, elemOpts, sourceOpts, parent, sources, i, len, sourceSrc, sizes, detail, hasPlaceholder, modified, emptyList;
		elem = e.target;

		if(!e.detail.dataAttr || e.defaultPrevented || riasCfg.disabled || !((sizes = elem.getAttribute(config.sizesAttr) || elem.getAttribute('sizes')) && regAllowedSizes.test(sizes))){return;}

		src = getSrc(elem);

		elemOpts = createAttrObject(elem, src);

		hasPlaceholder = regWidth.test(elemOpts.prefix) || regWidth.test(elemOpts.postfix);

		if(elemOpts.isPicture && (parent = elem.parentNode)){
			sources = parent.getElementsByTagName('source');
			for(i = 0, len = sources.length; i < len; i++){
				if ( hasPlaceholder || regWidth.test(sourceSrc = getSrc(sources[i])) ){
					sourceOpts = getElementOptions(sources[i], sourceSrc, elemOpts);
					setSrc(sourceSrc, sourceOpts, sources[i]);
					modified = true;
				}
			}
		}

		if ( hasPlaceholder || regWidth.test(src) ){
			setSrc(src, elemOpts, elem);
			modified = true;
		} else if (modified) {
			emptyList = [];
			emptyList.srcset = [];
			emptyList.isPicture = true;
			Object.defineProperty(elem, '_lazyrias', {
				value: emptyList,
				writable: true
			});
		}

		if(modified){
			if(supportPicture){
				elem.removeAttribute(config.srcAttr);
			} else if(sizes != 'auto') {
				detail = {
					width: parseInt(sizes, 10)
				};
				polyfill({
					target: elem,
					detail: detail
				});
			}
		}
	}, true);
	// partial polyfill
	var polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};

		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;
				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var getWSet = function(elem, testPicture){
			var src;
			if(!elem._lazyrias && lazySizes.pWS && (src = lazySizes.pWS(elem.getAttribute(config.srcsetAttr || ''))).length){
				Object.defineProperty(elem, '_lazyrias', {
					value: src,
					writable: true
				});
				if(testPicture && elem.parentNode){
					src.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';
				}
			}
			return elem._lazyrias;
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.4, dpr);
		};

		var getCandidate = function(elem, width){
			var sources, i, len, media, srces, src;

			srces = elem._lazyrias;

			if(srces.isPicture && window.matchMedia){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if(getWSet(sources[i]) && !sources[i].getAttribute('type') && ( !(media = sources[i].getAttribute('media')) || ((matchMedia(media) || {}).matches))){
						srces = sources[i]._lazyrias;
						break;
					}
				}
			}

			if(!srces.w || srces.w < width){
				srces.w = width;
				srces.d = getX(elem);
				src = reduceCandidate(srces.sort(ascendingSort));
			}

			return src;
		};

		var polyfill = function(e){
			if(e.detail.instance != lazySizes){return;}

			var candidate;
			var elem = e.target;

			if(!buggySizes && (window.respimage || window.picturefill || lazySizesCfg.pf)){
				document.removeEventListener('lazybeforesizes', polyfill);
				return;
			}

			if(!('_lazyrias' in elem) && (!e.detail.dataAttr || !getWSet(elem, true))){
				return;
			}

			candidate = getCandidate(elem, e.detail.width);

			if(candidate && candidate.u && elem._lazyrias.cur != candidate.u){
				elem._lazyrias.cur = candidate.u;
				candidate.cached = true;
				lazySizes.rAF(function(){
					elem.setAttribute(config.srcAttr, candidate.u);
					elem.setAttribute('src', candidate.u);
				});
			}
		};

		if(!supportPicture){
			addEventListener('lazybeforesizes', polyfill);
		} else {
			polyfill = function(){};
		}

		return polyfill;

	})();

}));
}(ls_rias));

var ls_bgset = {exports: {}};

(function (module) {
(function(window, factory) {
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(window, function(window, document, lazySizes) {
	if(!window.addEventListener){return;}

	var lazySizesCfg = lazySizes.cfg;
	var regWhite = /\s+/g;
	var regSplitSet = /\s*\|\s+|\s+\|\s*/g;
	var regSource = /^(.+?)(?:\s+\[\s*(.+?)\s*\])(?:\s+\[\s*(.+?)\s*\])?$/;
	var regType = /^\s*\(*\s*type\s*:\s*(.+?)\s*\)*\s*$/;
	var regBgUrlEscape = /\(|\)|'/;
	var allowedBackgroundSize = {contain: 1, cover: 1};
	var proxyWidth = function(elem){
		var width = lazySizes.gW(elem, elem.parentNode);

		if(!elem._lazysizesWidth || width > elem._lazysizesWidth){
			elem._lazysizesWidth = width;
		}
		return elem._lazysizesWidth;
	};
	var getBgSize = function(elem){
		var bgSize;

		bgSize = (getComputedStyle(elem) || {getPropertyValue: function(){}}).getPropertyValue('background-size');

		if(!allowedBackgroundSize[bgSize] && allowedBackgroundSize[elem.style.backgroundSize]){
			bgSize = elem.style.backgroundSize;
		}

		return bgSize;
	};
	var setTypeOrMedia = function(source, match){
		if(match){
			var typeMatch = match.match(regType);
			if(typeMatch && typeMatch[1]){
				source.setAttribute('type', typeMatch[1]);
			} else {
				source.setAttribute('media', lazySizesCfg.customMedia[match] || match);
			}
		}
	};
	var createPicture = function(sets, elem, img){
		var picture = document.createElement('picture');
		var sizes = elem.getAttribute(lazySizesCfg.sizesAttr);
		var ratio = elem.getAttribute('data-ratio');
		var optimumx = elem.getAttribute('data-optimumx');

		if(elem._lazybgset && elem._lazybgset.parentNode == elem){
			elem.removeChild(elem._lazybgset);
		}

		Object.defineProperty(img, '_lazybgset', {
			value: elem,
			writable: true
		});
		Object.defineProperty(elem, '_lazybgset', {
			value: picture,
			writable: true
		});

		sets = sets.replace(regWhite, ' ').split(regSplitSet);

		picture.style.display = 'none';
		img.className = lazySizesCfg.lazyClass;

		if(sets.length == 1 && !sizes){
			sizes = 'auto';
		}

		sets.forEach(function(set){
			var match;
			var source = document.createElement('source');

			if(sizes && sizes != 'auto'){
				source.setAttribute('sizes', sizes);
			}

			if((match = set.match(regSource))){
				source.setAttribute(lazySizesCfg.srcsetAttr, match[1]);

				setTypeOrMedia(source, match[2]);
				setTypeOrMedia(source, match[3]);
			} else {
				source.setAttribute(lazySizesCfg.srcsetAttr, set);
			}

			picture.appendChild(source);
		});

		if(sizes){
			img.setAttribute(lazySizesCfg.sizesAttr, sizes);
			elem.removeAttribute(lazySizesCfg.sizesAttr);
			elem.removeAttribute('sizes');
		}
		if(optimumx){
			img.setAttribute('data-optimumx', optimumx);
		}
		if(ratio) {
			img.setAttribute('data-ratio', ratio);
		}

		picture.appendChild(img);

		elem.appendChild(picture);
	};

	var proxyLoad = function(e){
		if(!e.target._lazybgset){return;}

		var image = e.target;
		var elem = image._lazybgset;
		var bg = image.currentSrc || image.src;


		if(bg){
			var useSrc = regBgUrlEscape.test(bg) ? JSON.stringify(bg) : bg;
			var event = lazySizes.fire(elem, 'bgsetproxy', {
				src: bg,
				useSrc: useSrc,
				fullSrc: null,
			});

			if(!event.defaultPrevented){
				elem.style.backgroundImage = event.detail.fullSrc || 'url(' + event.detail.useSrc + ')';
			}
		}

		if(image._lazybgsetLoading){
			lazySizes.fire(elem, '_lazyloaded', {}, false, true);
			delete image._lazybgsetLoading;
		}
	};

	addEventListener('lazybeforeunveil', function(e){
		var set, image, elem;

		if(e.defaultPrevented || !(set = e.target.getAttribute('data-bgset'))){return;}

		elem = e.target;
		image = document.createElement('img');

		image.alt = '';

		image._lazybgsetLoading = true;
		e.detail.firesLoad = true;

		createPicture(set, elem, image);

		setTimeout(function(){
			lazySizes.loader.unveil(image);

			lazySizes.rAF(function(){
				lazySizes.fire(image, '_lazyloaded', {}, true, true);
				if(image.complete) {
					proxyLoad({target: image});
				}
			});
		});

	});

	document.addEventListener('load', proxyLoad, true);

	window.addEventListener('lazybeforesizes', function(e){
		if(e.detail.instance != lazySizes){return;}
		if(e.target._lazybgset && e.detail.dataAttr){
			var elem = e.target._lazybgset;
			var bgSize = getBgSize(elem);

			if(allowedBackgroundSize[bgSize]){
				e.target._lazysizesParentFit = bgSize;

				lazySizes.rAF(function(){
					e.target.setAttribute('data-parent-fit', bgSize);
					if(e.target._lazysizesParentFit){
						delete e.target._lazysizesParentFit;
					}
				});
			}
		}
	}, true);

	document.documentElement.addEventListener('lazybeforesizes', function(e){
		if(e.defaultPrevented || !e.target._lazybgset || e.detail.instance != lazySizes){return;}
		e.detail.width = proxyWidth(e.target._lazybgset);
	});
}));
}(ls_bgset));

var ls_respimg = {exports: {}};

(function (module) {
(function(window, factory) {
	if(!window) {return;}
	var globalInstall = function(){
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};

	factory = factory.bind(null, window, window.document);

	if(module.exports){
		factory(lazysizes.exports);
	} else if(window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
}(typeof window != 'undefined' ?
	window : 0, function(window, document, lazySizes) {
	var polyfill;
	var lazySizesCfg = lazySizes.cfg;
	var img = document.createElement('img');
	var supportSrcset = ('sizes' in img) && ('srcset' in img);
	var regHDesc = /\s+\d+h/g;
	var fixEdgeHDescriptor = (function(){
		var regDescriptors = /\s+(\d+)(w|h)\s+(\d+)(w|h)/;
		var forEach = Array.prototype.forEach;

		return function(){
			var img = document.createElement('img');
			var removeHDescriptors = function(source){
				var ratio, match;
				var srcset = source.getAttribute(lazySizesCfg.srcsetAttr);
				if(srcset){
					if((match = srcset.match(regDescriptors))){
						if(match[2] == 'w'){
							ratio = match[1] / match[3];
						} else {
							ratio = match[3] / match[1];
						}

						if(ratio){
							source.setAttribute('data-aspectratio', ratio);
						}
						source.setAttribute(lazySizesCfg.srcsetAttr, srcset.replace(regHDesc, ''));
					}
				}
			};
			var handler = function(e){
				if(e.detail.instance != lazySizes){return;}
				var picture = e.target.parentNode;

				if(picture && picture.nodeName == 'PICTURE'){
					forEach.call(picture.getElementsByTagName('source'), removeHDescriptors);
				}
				removeHDescriptors(e.target);
			};

			var test = function(){
				if(!!img.currentSrc){
					document.removeEventListener('lazybeforeunveil', handler);
				}
			};

			document.addEventListener('lazybeforeunveil', handler);

			img.onload = test;
			img.onerror = test;

			img.srcset = 'data:,a 1w 1h';

			if(img.complete){
				test();
			}
		};
	})();

	if(!lazySizesCfg.supportsType){
		lazySizesCfg.supportsType = function(type/*, elem*/){
			return !type;
		};
	}

	if (window.HTMLPictureElement && supportSrcset) {
		if(!lazySizes.hasHDescriptorFix && document.msElementsFromPoint){
			lazySizes.hasHDescriptorFix = true;
			fixEdgeHDescriptor();
		}
		return;
	}

	if(window.picturefill || lazySizesCfg.pf){return;}

	lazySizesCfg.pf = function(options){
		var i, len;
		if(window.picturefill){return;}
		for(i = 0, len = options.elements.length; i < len; i++){
			polyfill(options.elements[i]);
		}
	};

	// partial polyfill
	polyfill = (function(){
		var ascendingSort = function( a, b ) {
			return a.w - b.w;
		};
		var regPxLength = /^\s*\d+\.*\d*px\s*$/;
		var reduceCandidate = function (srces) {
			var lowerCandidate, bonusFactor;
			var len = srces.length;
			var candidate = srces[len -1];
			var i = 0;

			for(i; i < len;i++){
				candidate = srces[i];
				candidate.d = candidate.w / srces.w;

				if(candidate.d >= srces.d){
					if(!candidate.cached && (lowerCandidate = srces[i - 1]) &&
						lowerCandidate.d > srces.d - (0.13 * Math.pow(srces.d, 2.2))){

						bonusFactor = Math.pow(lowerCandidate.d - 0.6, 1.6);

						if(lowerCandidate.cached) {
							lowerCandidate.d += 0.15 * bonusFactor;
						}

						if(lowerCandidate.d + ((candidate.d - srces.d) * bonusFactor) > srces.d){
							candidate = lowerCandidate;
						}
					}
					break;
				}
			}
			return candidate;
		};

		var parseWsrcset = (function(){
			var candidates;
			var regWCandidates = /(([^,\s].[^\s]+)\s+(\d+)w)/g;
			var regMultiple = /\s/;
			var addCandidate = function(match, candidate, url, wDescriptor){
				candidates.push({
					c: candidate,
					u: url,
					w: wDescriptor * 1
				});
			};

			return function(input){
				candidates = [];
				input = input.trim();
				input
					.replace(regHDesc, '')
					.replace(regWCandidates, addCandidate)
				;

				if(!candidates.length && input && !regMultiple.test(input)){
					candidates.push({
						c: input,
						u: input,
						w: 99
					});
				}

				return candidates;
			};
		})();

		var runMatchMedia = function(){
			if(runMatchMedia.init){return;}

			runMatchMedia.init = true;
			addEventListener('resize', (function(){
				var timer;
				var matchMediaElems = document.getElementsByClassName('lazymatchmedia');
				var run = function(){
					var i, len;
					for(i = 0, len = matchMediaElems.length; i < len; i++){
						polyfill(matchMediaElems[i]);
					}
				};

				return function(){
					clearTimeout(timer);
					timer = setTimeout(run, 66);
				};
			})());
		};

		var createSrcset = function(elem, isImage){
			var parsedSet;
			var srcSet = elem.getAttribute('srcset') || elem.getAttribute(lazySizesCfg.srcsetAttr);

			if(!srcSet && isImage){
				srcSet = !elem._lazypolyfill ?
					(elem.getAttribute(lazySizesCfg.srcAttr) || elem.getAttribute('src')) :
					elem._lazypolyfill._set
				;
			}

			if(!elem._lazypolyfill || elem._lazypolyfill._set != srcSet){

				parsedSet = parseWsrcset( srcSet || '' );
				if(isImage && elem.parentNode){
					parsedSet.isPicture = elem.parentNode.nodeName.toUpperCase() == 'PICTURE';

					if(parsedSet.isPicture){
						if(window.matchMedia){
							lazySizes.aC(elem, 'lazymatchmedia');
							runMatchMedia();
						}
					}
				}

				parsedSet._set = srcSet;
				Object.defineProperty(elem, '_lazypolyfill', {
					value: parsedSet,
					writable: true
				});
			}
		};

		var getX = function(elem){
			var dpr = window.devicePixelRatio || 1;
			var optimum = lazySizes.getX && lazySizes.getX(elem);
			return Math.min(optimum || dpr, 2.5, dpr);
		};

		var matchesMedia = function(media){
			if(window.matchMedia){
				matchesMedia = function(media){
					return !media || (matchMedia(media) || {}).matches;
				};
			} else {
				return !media;
			}

			return matchesMedia(media);
		};

		var getCandidate = function(elem){
			var sources, i, len, source, srces, src, width;

			source = elem;
			createSrcset(source, true);
			srces = source._lazypolyfill;

			if(srces.isPicture){
				for(i = 0, sources = elem.parentNode.getElementsByTagName('source'), len = sources.length; i < len; i++){
					if( lazySizesCfg.supportsType(sources[i].getAttribute('type'), elem) && matchesMedia( sources[i].getAttribute('media')) ){
						source = sources[i];
						createSrcset(source);
						srces = source._lazypolyfill;
						break;
					}
				}
			}

			if(srces.length > 1){
				width = source.getAttribute('sizes') || '';
				width = regPxLength.test(width) && parseInt(width, 10) || lazySizes.gW(elem, elem.parentNode);
				srces.d = getX(elem);
				if(!srces.src || !srces.w || srces.w < width){
					srces.w = width;
					src = reduceCandidate(srces.sort(ascendingSort));
					srces.src = src;
				} else {
					src = srces.src;
				}
			} else {
				src = srces[0];
			}

			return src;
		};

		var p = function(elem){
			if(supportSrcset && elem.parentNode && elem.parentNode.nodeName.toUpperCase() != 'PICTURE'){return;}
			var candidate = getCandidate(elem);

			if(candidate && candidate.u && elem._lazypolyfill.cur != candidate.u){
				elem._lazypolyfill.cur = candidate.u;
				candidate.cached = true;
				elem.setAttribute(lazySizesCfg.srcAttr, candidate.u);
				elem.setAttribute('src', candidate.u);
			}
		};

		p.parse = parseWsrcset;

		return p;
	})();

	if(lazySizesCfg.loadedClass && lazySizesCfg.loadingClass){
		(function(){
			var sels = [];
			['img[sizes$="px"][srcset].', 'picture > img:not([srcset]).'].forEach(function(sel){
				sels.push(sel + lazySizesCfg.loadedClass);
				sels.push(sel + lazySizesCfg.loadingClass);
			});
			lazySizesCfg.pf({
				elements: document.querySelectorAll(sels.join(', '))
			});
		})();

	}
}));
}(ls_respimg));

var selectors$x = {
  form: ".selectors-form",
  disclosureList: "[data-disclosure-list]",
  disclosureToggle: "[data-disclosure-toggle]",
  disclosureInput: "[data-disclosure-input]",
  disclosureOptions: "[data-disclosure-option]"
};
var classes$7 = {
  listVisible: "disclosure-list--visible"
};

function has(list, selector) {
  return list.map(l => l.contains(selector)).filter(Boolean);
}

var disclosure = (node, container) => {
  var form = container.querySelector(selectors$x.form);
  var disclosureList = node.querySelector(selectors$x.disclosureList);
  var disclosureToggle = node.querySelector(selectors$x.disclosureToggle);
  var disclosureInput = node.querySelector(selectors$x.disclosureInput);
  var disclosureOptions = node.querySelectorAll(selectors$x.disclosureOptions);
  disclosureOptions.forEach(option => option.addEventListener("click", submitForm));
  disclosureToggle.addEventListener("click", handleToggle);
  disclosureToggle.addEventListener("focusout", handleToggleFocusOut);
  disclosureList.addEventListener("focusout", handleListFocusOut);
  node.addEventListener("keyup", handleKeyup);
  document.addEventListener("click", handleBodyClick);

  function submitForm(evt) {
    evt.preventDefault();
    var {
      value
    } = evt.currentTarget.dataset;
    disclosureInput.value = value;
    form.submit();
  }

  function handleToggleFocusOut(evt) {
    var disclosureLostFocus = has([node], evt.relatedTarget).length === 0;

    if (disclosureLostFocus) {
      hideList();
    }
  }

  function handleListFocusOut(evt) {
    var childInFocus = has([node], evt.relatedTarget).length > 0;
    var isVisible = disclosureList.classList.contains(classes$7.listVisible);

    if (isVisible && !childInFocus) {
      hideList();
    }
  }

  function handleKeyup(evt) {
    if (evt.which !== 27) return;
    hideList();
    disclosureToggle.focus();
  }

  function handleToggle(evt) {
    disclosureList.classList.toggle(classes$7.listVisible);
    var ariaExpanded = disclosureList.classList.contains(classes$7.listVisible);
    evt.currentTarget.setAttribute("aria-expanded", ariaExpanded);

    if (ariaExpanded) {
      r$1("navitem:closeOthers");
    }
  }

  function handleBodyClick(evt) {
    var isOption = has([node], evt.target).length > 0;
    var isVisible = disclosureList.classList.contains(classes$7.listVisible);

    if (isVisible && !isOption) {
      hideList();
    }
  }

  function hideList() {
    disclosureToggle.setAttribute("aria-expanded", false);
    disclosureList.classList.remove(classes$7.listVisible);
  }

  var unload = () => {
    disclosureOptions.forEach(o => o.removeEventListener("click", submitForm));
    disclosureToggle.removeEventListener("click", handleToggle);
    disclosureToggle.removeEventListener("focusout", handleToggleFocusOut);
    disclosureList.removeEventListener("focusout", handleListFocusOut);
    node.removeEventListener("keyup", handleKeyup);
    document.removeEventListener("click", handleBodyClick);
  };

  return {
    unload,
    hideList
  };
};

var selectors$w = {
  disclosure: "[data-disclosure]",
  header: "[data-header]"
};
register("footer", {
  crossBorder: {},

  onLoad() {
    var headers = t$6(selectors$w.header, this.container);
    this.headerClick = e$3(headers, "click", handleHeaderClick);

    function handleHeaderClick(_ref) {
      var {
        currentTarget
      } = _ref;
      var {
        nextElementSibling: content
      } = currentTarget;
      l(currentTarget, "open", !isVisible(content));
      slideStop(content);

      if (isVisible(content)) {
        slideUp(content);
      } else {
        slideDown(content);
      }
    } // Wire up Cross Border disclosures


    var cbSelectors = this.container.querySelectorAll(selectors$w.disclosure);

    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        var {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = disclosure(selector, this.container);
      });
    }
  },

  onUnload() {
    this.headerClick();
    Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].unload();
    });
  }

});

var selectors$v = {
  activeItem: "nav__item--active",
  activeMenu: "nav__menu--active",
  navTrigger: "[data-navmenu-trigger]",
  subMenu: "[data-nav-submenu]",
  headerNav: ".header__nav",
  navLink: ".nav__link",
  linkParent: ".nav__link-parent",
  itemParent: ".nav__item-parent",
  navDepthOne: ".nav--depth-1",
  navDepthTwo: ".nav--depth-2",
  navDepthThree: ".nav--depth-3",
  quickSearchTrigger: ".quick-search__trigger",
  headerAcccountIcon: ".header__icon--account",
  logoTrigger: ".header__logo-image"
};

var navigation = node => {
  var header = node.querySelector(".header");
  var headerNav = node.querySelector(selectors$v.headerNav);
  var navDepthOne = headerNav.querySelector(selectors$v.navDepthOne);
  var navDepthThree = headerNav.querySelectorAll(selectors$v.navDepthThree);
  var headerLinks = navDepthOne.querySelectorAll("".concat(selectors$v.navDepthOne, " > li:not(").concat(selectors$v.itemParent, ") > ").concat(selectors$v.navLink));
  var logoTrigger = node.querySelector(selectors$v.logoTrigger);
  var quickSearchTrigger = node.querySelector(selectors$v.quickSearchTrigger);
  var accountTrigger = node.querySelector("".concat(selectors$v.headerAcccountIcon, " > a"));
  var navMenuTrigger = node.querySelectorAll("".concat(selectors$v.navTrigger, " > ").concat(selectors$v.linkParent));
  var {
    navigationInteraction
  } = node.dataset;
  var mouseInteractionIsHover = navigationInteraction === "mouseover";
  var megaNavigationAnimation = animateMegaNavigation(header);
  var events = [];

  var _addEvent = (element, action, func) => {
    element.addEventListener(action, func, true);
    events.push({
      element,
      action,
      func
    });
  };

  var _bindEvents = () => {
    _addEvent(document, "click", _handleBodyClick);

    navMenuTrigger.forEach(trigger => {
      _addEvent(trigger, "focusin", _handleFocusIn);

      _addEvent(trigger, navigationInteraction, _toggleMenu);

      if (!mouseInteractionIsHover) {
        _addEvent(trigger, "click", _preventHandler);
      }
    });
    headerLinks.forEach(link => {
      _addEvent(link, "focus", _hideOverlay);

      _addEvent(link, "focus", closeAll);
    });

    if (logoTrigger) {
      _addEvent(logoTrigger, "focus", closeAll);

      _addEvent(logoTrigger, "focus", _hideOverlay);
    }

    if (quickSearchTrigger) {
      _addEvent(quickSearchTrigger, "focus", closeAll);

      _addEvent(quickSearchTrigger, "focus", _hideOverlay);
    }

    if (accountTrigger) {
      _addEvent(accountTrigger, "focus", closeAll);

      _addEvent(accountTrigger, "focus", _hideOverlay);
    } // Init scroll watcher


    _addEvent(navDepthOne, "scroll", _handleScroll);
  }; // Close all nav drop downs if anything is clicked outside of menu


  var _handleBodyClick = event => {
    if (!u().headerOverlayOpen) return;

    if (event.target.matches("[data-navigation-dropdown-trigger], [data-navigation-dropdown-trigger] *")) {
      return;
    }

    if (!event.target.matches("[data-navigation-dropdown], [data-navigation-dropdown] *")) {
      _hideOverlay();

      closeAll();
    }
  };

  var _handleFocusIn = event => {
    event.preventDefault();

    if (document.body.classList.contains("user-is-tabbing")) {
      _toggleMenu(event);
    }
  };

  var _handleMouseleave = event => {
    closeAll();

    _hideOverlay();
  };

  var _toggleMenu = event => {
    event.preventDefault();
    var element = event.currentTarget.parentNode;
    var menu = element.querySelector(selectors$v.subMenu);

    if (menu.classList.contains("visible") && !mouseInteractionIsHover) {
      _closeMenu(element);
    } else {
      r$1("headerOverlay:show");

      _openMenu(element);
    }

    if (mouseInteractionIsHover && !menu.classList.contains("nav--depth-3")) {
      menu.addEventListener("mouseleave", _handleMouseleave, {
        once: true
      });
    }
  };

  var _preventHandler = e => {
    e.preventDefault();
  };

  var _hideOverlay = () => {
    r$1("headerOverlay:hide");
  };

  var _openMenu = target => {
    if (!target.parentNode.classList.contains("nav--depth-2")) {
      closeAll();
    } else {
      // Close all submenus
      target.parentNode.querySelectorAll(selectors$v.navTrigger).forEach(submenu => _closeMenu(submenu));
    }

    var menu = target.querySelector(selectors$v.subMenu);
    var menuLink = target.querySelector(selectors$v.navLink);
    menu.classList.add("visible");
    menuLink.classList.add(selectors$v.activeMenu);
    menuLink.setAttribute("aria-expanded", true);
    megaNavigationAnimation === null || megaNavigationAnimation === void 0 ? void 0 : megaNavigationAnimation.open(menu);
  };

  var _closeMenu = target => {
    var menu = target.querySelector(selectors$v.subMenu);
    var menuLink = target.querySelector(selectors$v.navLink);

    if (!target.parentNode.classList.contains("nav--depth-2")) {
      _hideOverlay();
    }

    menu.classList.remove("visible");
    menuLink.classList.remove(selectors$v.activeMenu);
    menuLink.setAttribute("aria-expanded", false);
    setTimeout(() => {
      megaNavigationAnimation === null || megaNavigationAnimation === void 0 ? void 0 : megaNavigationAnimation.close(menu);
    }, 300);
  };

  var closeAll = () => {
    node.classList.remove();
    var menuTriggers = node.querySelectorAll(selectors$v.navTrigger);
    menuTriggers.forEach(trigger => {
      var menu = trigger.querySelector(selectors$v.subMenu);
      var menuLink = trigger.querySelector(selectors$v.navLink);
      menu.classList.remove("visible");
      menuLink.classList.remove(selectors$v.activeMenu);
      menuLink.setAttribute("aria-expanded", false);
      setTimeout(() => {
        megaNavigationAnimation === null || megaNavigationAnimation === void 0 ? void 0 : megaNavigationAnimation.close(menu);
      }, 300);
    });
  };

  var _handleScroll = () => {
    var scroll = navDepthOne.scrollLeft;
    var root = document.documentElement;
    root.style.setProperty("--navigation-scroll-offset", "".concat(scroll, "px"));
  }; // https://stackoverflow.com/a/9333474


  function absleft(el) {
    var x = 0;

    for (; el; el = el.offsetParent) {
      x += el.offsetLeft;
    }

    return x;
  }

  function overflows(el, opt_container) {
    var left = absleft(el);
    var right = left + el.offsetWidth;
    var cleft = absleft(opt_container);
    var cright = cleft + opt_container.offsetWidth;
    return left < cleft || right > cright;
  } // Depth 3 menus can overflow the document need to check and adjust


  var _handleSubmenuPageOverflow = menus => {
    menus.forEach(menu => {
      if (overflows(menu, document.body)) {
        menu.classList.add("overflows");
      }
    });
  };

  _bindEvents();

  _handleSubmenuPageOverflow(navDepthThree);

  var unload = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  return {
    unload,
    closeAll
  };
};

function PredictiveSearch(resultsContainer) {
  var cachedResults = {};

  function renderSearchResults(resultsMarkup) {
    resultsContainer.innerHTML = resultsMarkup;
  }

  function getSearchResults(searchTerm) {
    var queryKey = searchTerm ? searchTerm.replace(" ", "-").toLowerCase() : ""; // Render result if it appears within the cache

    if (cachedResults["".concat(queryKey)]) {
      renderSearchResults(cachedResults["".concat(queryKey)]);
      return;
    }

    fetch("".concat(window.theme.routes.predictive_search_url, "?q=").concat(encodeURIComponent(searchTerm), "&section_id=predictive-search")).then(response => {
      if (!response.ok) {
        var error = new Error(response.status);
        throw error;
      }

      return response.text();
    }).then(text => {
      var resultsMarkup = new DOMParser().parseFromString(text, "text/html").querySelector("#shopify-section-predictive-search").innerHTML; // Cache results

      cachedResults[queryKey] = resultsMarkup;
      renderSearchResults(resultsMarkup);
    }).catch(error => {
      throw error;
    });
  }

  return {
    getSearchResults
  };
}

var selectors$u = {
  trigger: ".quick-search__trigger",
  searchOverlay: ".search__overlay",
  searchInput: ".search__input",
  inputClear: ".search__input-clear",
  inputClose: ".search__input-close",
  results: ".search__results"
};
var classNames = {
  active: "is-active",
  activeQuery: "has-active-query",
  activeSuggestions: "has-suggestions"
};

var quickSearch = opts => {
  var container = opts.container;
  var trigger = container.querySelector(selectors$u.trigger);
  var overlay = container.querySelector(selectors$u.searchOverlay);
  var searchInput = container.querySelector(selectors$u.searchInput);
  var searchInputClear = container.querySelector(selectors$u.inputClear);
  var searchInputClose = container.querySelector(selectors$u.inputClose);
  var resultsContainer = container.querySelector(selectors$u.results);
  var events = [];
  var predictiveSearch = PredictiveSearch(resultsContainer);

  var _bindEvents = () => {
    _addEvent(trigger, "click", _showSearchBar);

    _addEvent(overlay, "click", _hideSearchBar);

    _addEvent(document, "keydown", _handleEsq);

    _addEvent(searchInput, "input", _searchInputHandler);

    _addEvent(searchInputClose, "click", _hideSearchBar);

    _addEvent(searchInputClear, "click", _clearSearchInput);
  };

  var _addEvent = (element, action, func) => {
    element.addEventListener(action, func, true);
    events.push({
      element,
      action,
      func
    });
  };

  var _showSearchBar = e => {
    e.preventDefault();
    trigger.setAttribute("aria-expanded", true);
    searchInputClose.setAttribute("aria-expanded", true);
    container.classList.add(classNames.active);
    searchInput.focus();
  };

  var _hideSearchBar = e => {
    e.preventDefault();
    trigger.setAttribute("aria-expanded", false);
    searchInputClose.setAttribute("aria-expanded", false);
    container.classList.remove(classNames.active);
  };

  var _handleEsq = e => {
    if (container.classList.contains(classNames.active) && e.keyCode === 27) {
      _hideSearchBar(e);
    }
  };

  var _reset = () => {
    searchInput.value = "";
    container.classList.remove(classNames.activeQuery);
    container.classList.remove(classNames.activeSuggestions);
    searchInput.focus();
    resultsContainer.innerHTML = "";
  };

  var _clearSearchInput = e => {
    e.preventDefault();

    _reset();
  };

  var _searchInputHandler = event => {
    var query = event.target.value;

    if (query === "") {
      _reset();

      return;
    }

    container.classList.add(classNames.activeQuery);
    container.classList.add(classNames.activeSuggestions);
    predictiveSearch.getSearchResults(query);
  };

  var unload = () => {
    events.forEach(event => {
      event.element.removeEventListener(event.action, event.function);
    });
  };

  _bindEvents();

  return {
    unload
  };
};

var candidateSelectors = [
  'input',
  'select',
  'textarea',
  'a[href]',
  'button',
  '[tabindex]',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
];
var candidateSelector = candidateSelectors.join(',');

var matches = typeof Element === 'undefined'
  ? function () {}
  : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;

function tabbable(el, options) {
  options = options || {};

  var regularTabbables = [];
  var orderedTabbables = [];

  var candidates = el.querySelectorAll(candidateSelector);

  if (options.includeContainer) {
    if (matches.call(el, candidateSelector)) {
      candidates = Array.prototype.slice.apply(candidates);
      candidates.unshift(el);
    }
  }

  var i, candidate, candidateTabindex;
  for (i = 0; i < candidates.length; i++) {
    candidate = candidates[i];

    if (!isNodeMatchingSelectorTabbable(candidate)) continue;

    candidateTabindex = getTabindex(candidate);
    if (candidateTabindex === 0) {
      regularTabbables.push(candidate);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        node: candidate,
      });
    }
  }

  var tabbableNodes = orderedTabbables
    .sort(sortOrderedTabbables)
    .map(function(a) { return a.node })
    .concat(regularTabbables);

  return tabbableNodes;
}

tabbable.isTabbable = isTabbable;
tabbable.isFocusable = isFocusable;

function isNodeMatchingSelectorTabbable(node) {
  if (
    !isNodeMatchingSelectorFocusable(node)
    || isNonTabbableRadio(node)
    || getTabindex(node) < 0
  ) {
    return false;
  }
  return true;
}

function isTabbable(node) {
  if (!node) throw new Error('No node provided');
  if (matches.call(node, candidateSelector) === false) return false;
  return isNodeMatchingSelectorTabbable(node);
}

function isNodeMatchingSelectorFocusable(node) {
  if (
    node.disabled
    || isHiddenInput(node)
    || isHidden(node)
  ) {
    return false;
  }
  return true;
}

var focusableCandidateSelector = candidateSelectors.concat('iframe').join(',');
function isFocusable(node) {
  if (!node) throw new Error('No node provided');
  if (matches.call(node, focusableCandidateSelector) === false) return false;
  return isNodeMatchingSelectorFocusable(node);
}

function getTabindex(node) {
  var tabindexAttr = parseInt(node.getAttribute('tabindex'), 10);
  if (!isNaN(tabindexAttr)) return tabindexAttr;
  // Browsers do not return `tabIndex` correctly for contentEditable nodes;
  // so if they don't have a tabindex attribute specifically set, assume it's 0.
  if (isContentEditable(node)) return 0;
  return node.tabIndex;
}

function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
}

function isContentEditable(node) {
  return node.contentEditable === 'true';
}

function isInput(node) {
  return node.tagName === 'INPUT';
}

function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
}

function isRadio(node) {
  return isInput(node) && node.type === 'radio';
}

function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
}

function getCheckedRadio(nodes) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked) {
      return nodes[i];
    }
  }
}

function isTabbableRadio(node) {
  if (!node.name) return true;
  // This won't account for the edge case where you have radio groups with the same
  // in separate forms on the same page.
  var radioSet = node.ownerDocument.querySelectorAll('input[type="radio"][name="' + node.name + '"]');
  var checked = getCheckedRadio(radioSet);
  return !checked || checked === node;
}

function isHidden(node) {
  // offsetParent being null will allow detecting cases where an element is invisible or inside an invisible element,
  // as long as the element does not use position: fixed. For them, their visibility has to be checked directly as well.
  return node.offsetParent === null || getComputedStyle(node).visibility === 'hidden';
}

var tabbable_1 = tabbable;

function t$2(e){var t=e.onfocus,n=document.createElement("div");return n.style.cssText="\n    width: 1px;\n    height: 0px;\n    padding: 0px;\n    overflow: hidden;\n    position: fixed;\n    top: 1px;\n    left: 1px;\n  ",n.onfocus=t,n.setAttribute("tabindex","0"),n.setAttribute("aria-hidden","true"),n.setAttribute("data-lockbox",""),n}function n(n){if(n){var o,i,r=document.activeElement,c=tabbable_1(n);if(!n.querySelector("[data-lockbox]")){o=t$2({onfocus:function(){var e=c[c.length-1];e&&e.focus();}}),i=t$2({onfocus:function(){var e=c[0];e&&e.focus();}}),n.insertBefore(o,n.children[0]),n.appendChild(i);var u=c[0];u&&u.focus();}return function(){n.removeChild(o),n.removeChild(i),r.focus();}}}

var classes$6 = {
  active: "active",
  visible: "visible"
};
function mobileQuickSearch (node) {
  var form = node.querySelector("form");
  var input = node.querySelector("[data-input]");
  var closeBtn = node.querySelector("[data-close]");
  var resultsContainer = node.querySelector("[data-results]"); // This gets replaced with a focus trapping util on `open` however
  // this should prevent any errors if the quick search is destroyed
  // when it wasn't open

  var lockbox = () => {};

  closeBtn.addEventListener("click", close);
  node.addEventListener("keydown", checkEscape);
  input.addEventListener("input", handleInput);
  var predictiveSearch = PredictiveSearch(resultsContainer);

  function handleInput(e) {
    var query = e.target.value;

    if (e.target.value === "") {
      resultsContainer.innerHTML = "";
      return;
    }

    predictiveSearch.getSearchResults(query);
  }

  function checkEscape(_ref) {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) close();
  }

  function open() {
    node.classList.add(classes$6.active);
    closeBtn.setAttribute("aria-expanded", true); // setTimeout(() => {

    lockbox = n(form);
    disableBodyScroll(node);
    node.classList.add(classes$6.visible);
    input.focus(); // }, 50);
  }

  function close(e) {
    e && e.preventDefault();
    document.querySelectorAll("[aria-controls=\"".concat(node.id, "\"]")).forEach(control => {
      control.setAttribute("aria-expanded", false);
    });
    node.classList.remove(classes$6.visible);
    setTimeout(() => {
      node.classList.remove(classes$6.active);
      enableBodyScroll(node);
      lockbox();
    }, 350);
  }

  function destroy() {
    close();
    closeBtn.addEventListener("click", close);
    node.removeEventListener("keydown", checkEscape);
    input.removeEventListener("input", handleInput);
  }

  return {
    open,
    close,
    destroy
  };
}

var sel$3 = {
  overlay: "[data-overlay]",
  listItem: "[data-list-item]",
  item: "[data-item]",
  allLinks: "[data-all-links]",
  main: "[data-main]",
  primary: "[data-primary-container]",
  footer: "[data-footer]",
  close: "[data-close-drawer]",
  logo: ".drawer-menu__logo",
  // Cross border
  form: ".drawer-menu__form",
  localeInput: "[data-locale-input]",
  currencyInput: "[data-currency-input]",
  // Quick search
  quickSearch: "[data-quick-search]"
};
var classes$5 = {
  active: "active",
  visible: "visible",
  countrySelector: "drawer-menu__list--country-selector"
}; // Extra space we add to the height of the inner container

var formatHeight = h => h + 8 + "px";

var menu = node => {
  // Entire links container
  var primaryDepth = 0; // The individual link list the merchant selected

  var linksDepth = 0;
  var scrollPosition = 0;
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  var overlay = node.querySelector(sel$3.overlay);
  overlay.addEventListener("click", close);
  var quickSearchEl = node.querySelector(sel$3.quickSearch);
  var quickSearch = quickSearchEl ? mobileQuickSearch(quickSearchEl) : null;
  var searchLink = node.querySelector("[data-search]");
  searchLink && searchLink.addEventListener("click", openSearch); // Element that holds all links, primary and secondary

  var everything = node.querySelector(sel$3.allLinks); // This is the element that holds the one we move left and right (primary)
  // We also need to assign its height initially so we get smooth transitions

  var main = node.querySelector(sel$3.main); // Element that holds all the primary links and moves left and right

  var primary = node.querySelector(sel$3.primary); // Cross border

  var form = node.querySelector(sel$3.form);
  var localeInput = node.querySelector(sel$3.localeInput);
  var currencyInput = node.querySelector(sel$3.currencyInput);
  var closeBtn = node.querySelector(sel$3.close);
  closeBtn.addEventListener("click", close); // Every individual menu item

  var items = node.querySelectorAll(sel$3.item);
  items.forEach(item => item.addEventListener("click", handleItem));
  animateDrawerMenu(node);

  function openSearch(e) {
    e.preventDefault();
    e.target.setAttribute("aria-expanded", true);
    quickSearch.open();
  }

  function handleItem(e) {
    e.preventDefault();
    var {
      item
    } = e.currentTarget.dataset;

    switch (item) {
      // Standard link that goes to a different url
      case "link":
        close();
        window.location = e.currentTarget.href;
        break;
      // Element that will navigate to child navigation list

      case "parent":
        clickParent(e);
        break;
      // Element that will navigate back up the tree

      case "back":
        clickBack(e);
        break;
      // Account, currency, and language link at the bottom

      case "secondary":
        handleSecondaryLink(e);
        break;
      // Back link within 'Currency' or 'Language'

      case "secondaryHeading":
        handleSecondaryHeading(e);
        break;
      // Individual language

      case "locale":
        handleLanguage(e);
        break;
      // Individual currency

      case "currency":
        handleCurrency(e);
        break;
    }
  }

  function open() {
    node.classList.add(classes$5.active);
    setTimeout(() => {
      focusTrap.activate();
      node.classList.add(classes$5.visible);
      disableBodyScroll(node, {
        hideBodyOverflow: true,
        allowTouchMove: el => {
          while (el && el !== document.body && el.id !== "main-content") {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }

            el = el.parentNode;
          }
        }
      });
      scrollPosition = window.pageYOffset;
      document.body.style.top = "-".concat(scrollPosition, "px");
      document.body.classList.add("scroll-lock");
      node.querySelectorAll("".concat(sel$3.primary, " > ").concat(sel$3.listItem, ", ").concat(sel$3.footer, " > li, ").concat(sel$3.footer, " > form > li"));

      if (primaryDepth === 0 && linksDepth === 0) {
        main.style.height = formatHeight(primary.offsetHeight);
      }
    }, 50);
  }

  function close(e) {
    e && e.preventDefault();
    focusTrap.deactivate();
    node.classList.remove(classes$5.visible);
    setTimeout(() => {
      node.classList.remove(classes$5.active);
      enableBodyScroll(node);
      document.body.classList.remove("scroll-lock");
      document.body.style.top = "";
      window.scrollTo(0, scrollPosition);
    }, 300);
  }

  function clickParent(e) {
    e.preventDefault();
    var parentLink = e.currentTarget;
    parentLink.ariaExpanded = "true";
    var childMenu = parentLink.nextElementSibling;
    childMenu.classList.add(classes$5.visible);
    main.style.height = formatHeight(childMenu.offsetHeight); // childMenu.querySelector('a').focus();

    childMenu.querySelectorAll(":scope > ".concat(sel$3.listItem));
    navigate(linksDepth += 1);
  }

  function navigate(depth) {
    linksDepth = depth;
    primary.setAttribute("data-depth", depth);
  }

  function navigatePrimary(depth) {
    primaryDepth = depth;
    everything.setAttribute("data-depth", depth);
  }

  function clickBack(e) {
    e.preventDefault();
    var menuBefore = e.currentTarget.closest(sel$3.listItem).closest("ul");
    main.style.height = formatHeight(menuBefore.offsetHeight);
    var parent = e.currentTarget.closest("ul");
    parent.classList.remove(classes$5.visible);
    var parentLink = parent.previousElementSibling;
    parentLink.ariaExpanded = "false";
    navigate(linksDepth -= 1);
  }

  function handleSecondaryLink(e) {
    e.preventDefault();
    navigatePrimary(1);
    var childMenu = e.currentTarget.nextElementSibling;
    childMenu.classList.add(classes$5.visible);
    childMenu.querySelectorAll(":scope > ".concat(sel$3.listItem));
  }

  function handleSecondaryHeading(e) {
    e.preventDefault();
    navigatePrimary(0);
    var parent = e.currentTarget.closest("ul");
    parent.classList.remove(classes$5.visible);
  }

  function handleCrossBorder(e, input) {
    var {
      value
    } = e.currentTarget.dataset;
    input.value = value;
    close();
    form.submit();
  }

  function handleKeyboard(e) {
    if (!node.classList.contains(classes$5.visible)) return;

    if (e.key == "Escape" || e.keyCode === 27 && drawerOpen) {
      close();
    }
  }

  var handleLanguage = e => handleCrossBorder(e, localeInput);

  var handleCurrency = e => handleCrossBorder(e, currencyInput);

  window.addEventListener("keydown", handleKeyboard);

  function destroy() {
    overlay.removeEventListener("click", close);
    closeBtn.removeEventListener("click", close);
    quickSearch && quickSearch.destroy();
    searchLink.removeEventListener("click", openSearch);
    items.forEach(item => item.removeEventListener("click", handleItem));
    enableBodyScroll(node);
    document.body.classList.remove("scroll-lock");
    document.body.style.top = "";
    window.scrollTo(0, scrollPosition);
    window.removeEventListener("keydown", handleKeyboard);
  }

  return {
    close,
    destroy,
    open
  };
};

var selectors$t = {
  jsCartCount: ".js-cart-count",
  jsCartToggle: ".js-cart-drawer-toggle",
  cartCountInner: ".quick-cart__indicator-inner",
  currencySelector: ".header__icon--currency",
  languageSelector: ".header__icon--language",
  disclosure: "[data-disclosure]",
  drawerMenu: "[data-drawer-menu]"
};
register("header", {
  crossBorder: {},

  onLoad() {
    var {
      enableQuickCart,
      enableQuickAddToCart
    } = document.body.dataset;
    var drawerMenu = document.querySelector(selectors$t.drawerMenu);
    this.menuButton = this.container.querySelector("#mobile-nav");
    var cartCount = this.container.querySelector(selectors$t.jsCartCount);
    var cartToggle = this.container.querySelector(selectors$t.jsCartToggle);
    this.navigation = navigation(this.container);
    this.navigationCloseHandler = c$1("navitem:closeOthers", () => {
      this.navigation.closeAll();
    });

    if (drawerMenu) {
      this.menu = menu(drawerMenu);
      this.menuButton.addEventListener("click", this._openMenu.bind(this));
    }

    if (enableQuickCart === "true" || enableQuickAddToCart === "true") {
      c$1("cart:updated", state => {
        var cartCountInner = cartCount.querySelector(selectors$t.cartCountInner);
        cartCountInner.innerHTML = state.cart.item_count;
        cartCount.classList.toggle("hidden", !state.cart.item_count);
      });
      cartToggle.addEventListener("click", e => {
        e.preventDefault();
        r$1("cart:toggle", state => {
          return {
            cartOpen: !state.cartOpen
          };
        });
      });
      c$1("cart:open", _ref => {
        cartToggle.setAttribute("aria-expanded", true);
      });
      c$1("cart:close", _ref2 => {
        cartToggle.setAttribute("aria-expanded", false);
      });
    }

    c$1("section:first-full-height", () => this.container.classList.add("first-section-is-full-width"));
    this.predictiveSearches = [];
    this.quickSearch = this.container.querySelectorAll(".quick-search");

    if (this.quickSearch.length) {
      this.quickSearch.forEach(container => {
        this.predictiveSearches.push(quickSearch({
          container: container
        }));
      });
    } // Custom event binding


    e$3(document, "apps:product-added-to-cart", cartUpdatedExternally);

    this._initDisclosure();
  },

  _openMenu(e) {
    var _this$menu;

    e.preventDefault();
    (_this$menu = this.menu) === null || _this$menu === void 0 ? void 0 : _this$menu.open();
  },

  _showHeaderOverlay(event) {
    if (event.target.ariaExpanded === "true") {
      r$1("headerOverlay:show");
    } else {
      r$1("headerOverlay:hide");
    }
  },

  _initDisclosure() {
    var languageSelectorContainer = this.container.querySelector(selectors$t.languageSelector);
    var currencySelectorContainer = this.container.querySelector(selectors$t.currencySelector);

    if (languageSelectorContainer) {
      this.languageTrigger = languageSelectorContainer.querySelector(selectors$t.disclosure);
      var {
        disclosure: d
      } = this.languageTrigger.dataset;
      this.crossBorder[d] = disclosure(this.languageTrigger, languageSelectorContainer);
      this.languageTrigger.addEventListener("click", this._showHeaderOverlay);
    }

    if (currencySelectorContainer) {
      this.currencyTrigger = currencySelectorContainer.querySelector(selectors$t.disclosure);
      var {
        disclosure: _d
      } = this.currencyTrigger.dataset;
      this.crossBorder[_d] = disclosure(this.currencyTrigger, currencySelectorContainer);
      this.currencyTrigger.addEventListener("click", this._showHeaderOverlay);
    }
  },

  onSelect() {
    r$1("sticky-header:reload", () => {});
  },

  onBlockSelect(_ref3) {
  },

  onUnload() {
    var _this$menu2;

    (_this$menu2 = this.menu) === null || _this$menu2 === void 0 ? void 0 : _this$menu2.destroy();
    this.predictiveSearch.unload();
    this.navigation.unload();
    this.navigationCloseHandler();
    this.predictiveSearches.forEach(search => search.unload());
    this.currencyTrigger && this.currencyTrigger.removeEventListener("click", this._showHeaderOverlay);
    this.languageTrigger && this.languageTrigger.removeEventListener("click", this._showHeaderOverlay);
    Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].unload();
    });
  }

});

var isMobile$2 = {exports: {}};

isMobile$2.exports = isMobile;
isMobile$2.exports.isMobile = isMobile;
isMobile$2.exports.default = isMobile;

var mobileRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

var tabletRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino|android|ipad|playbook|silk/i;

function isMobile (opts) {
  if (!opts) opts = {};
  var ua = opts.ua;
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua !== 'string') return false

  var result = opts.tablet ? tabletRE.test(ua) : mobileRE.test(ua);

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true;
  }

  return result
}

var isMobile$1 = isMobile$2.exports;

function localStorageAvailable() {
  var test = "test";

  try {
    localStorage.setItem(test, test);

    if (localStorage.getItem(test) !== test) {
      return false;
    }

    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

var PREFIX = "fluco_";

function getStorage(key) {
  if (!localStorageAvailable()) return null;
  return JSON.parse(localStorage.getItem(PREFIX + key));
}

function setStorage(key, val) {
  if (!localStorageAvailable()) return null;
  localStorage.setItem(PREFIX + key, val);
  return true;
}

function Popup(container) {
  var focusTrap = createFocusTrap(container, {
    allowOutsideClick: false
  });
  var {
    id,
    popupType,
    timeout
  } = container.dataset;
  var storageKey = "popup-".concat(id);
  var ageVerifiedKey = "age-verified-".concat(id);
  var ageIsVerified = Boolean(getStorage(ageVerifiedKey));
  var popupAnimation = animatePopup(container);

  var bodyLeave = () => {};

  var mouseleave = e => {
    if (!e.relatedTarget && !e.toElement) {
      showPopup();
      bodyLeave();
    }
  };

  var events = []; // Initialize popup based on type

  var popupTypes = {
    "age_popup": () => {
      var verifyBtn = n$3("[data-verify-age]", container);

      if (verifyBtn && !window.Shopify.designMode) {
        events.push(e$3([verifyBtn], "click", e => {
          e.preventDefault();
          hidePopup();
        }));
      }

      if (!ageIsVerified) {
        showPopup();
      }
    },
    "popup": () => {
      if (!window.Shopify.designMode) {
        var closeBtn = n$3("[data-close]", container);
        events.push(e$3([closeBtn], "click", e => {
          e.preventDefault();
          hidePopup();
        }));
        events.push(e$3(container, "keydown", _ref => {
          var {
            keyCode
          } = _ref;
          if (keyCode === 27) hidePopup();
        }));
      }

      if (!getStorage(storageKey) && isMobile$1()) {
        setTimeout(() => showPopup(), parseInt(timeout));
      } else if (!getStorage(storageKey)) {
        bodyLeave = e$3(document.body, "mouseout", mouseleave);
      }
    }
  };
  popupTypes[popupType]();

  function showPopup() {
    u$2(container, "visible");

    if (popupType === "age_popup") {
      disableBodyScroll(container);
      focusTrap.activate();
    }

    popupAnimation === null || popupAnimation === void 0 ? void 0 : popupAnimation.open();
  }

  function hidePopup() {
    setStorage(storageKey, JSON.stringify(new Date()));
    i$1(container, "visible");

    if (popupType === "age_popup") {
      setStorage(ageVerifiedKey, JSON.stringify(new Date()));
      setTimeout(() => {
        focusTrap.deactivate();
        enableBodyScroll(container);
        popupAnimation === null || popupAnimation === void 0 ? void 0 : popupAnimation.close();
      }, 300);
    } else {
      popupAnimation === null || popupAnimation === void 0 ? void 0 : popupAnimation.close();
    }
  }

  function unload() {
    bodyLeave();
    events.forEach(unsubscribe => unsubscribe());

    if (popupType === "age_popup") {
      focusTrap.deactivate();
      enableBodyScroll(container);
    }
  }

  return {
    unload,
    showPopup,
    hidePopup
  };
}

register("popup", {
  onLoad() {
    this.popups = t$6("[data-popup]", this.container).map(popup => {
      return {
        contructor: Popup(popup),
        element: popup
      };
    });
  },

  onBlockSelect(_ref) {
    var {
      target
    } = _ref;
    var targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.showPopup();
  },

  onBlockDeselect(_ref2) {
    var {
      target
    } = _ref2;
    var targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.hidePopup();
  },

  onUnload() {
    this.popups.forEach(popup => {
      var _popup$contructor;

      return (_popup$contructor = popup.contructor) === null || _popup$contructor === void 0 ? void 0 : _popup$contructor.unload();
    });
  }

});

function debounce(func) {
  var time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
  var timer;
  return function (event) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(func, time, event);
  };
}

var slideshowOpts$1 = {
  adaptiveHeight: false,
  pageDots: false,
  prevNextButtons: false,
  wrapAround: true,
  draggable: false
};
var selectors$s = {
  sliderContainer: ".utility-bar__announcements",
  announcements: ".utility-bar__announcement-item",
  socialContainer: ".utlity-bar__social-icons",
  disclosureContainer: ".utility-bar__disclosure-container",
  disclosure: "[data-disclosure]"
};
var modifiers = {
  active: "is-active",
  hidden: "is-hidden"
};
var rootVars = {
  utilityBar: "--utility-bar-height"
};
register("utility-bar", {
  crossBorder: {},

  onLoad() {
    this.sliderContainer = n$3(selectors$s.sliderContainer, this.container);
    this.announcements = t$6(selectors$s.announcements, this.container);
    this.events = [e$3(window, "resize", debounce(this._matchContentWidths, 150))];

    this._matchContentWidths();

    this._setUtilityBarVars();

    if (this.announcements.length) {
      this._initSlider();
    } // Wire up Cross Border disclosures


    var cbSelectors = t$6(selectors$s.disclosure, this.container);

    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        var {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = disclosure(selector, this.container);
      });
    }

    c$1("sticky-header:stuck", () => Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].hideList();
    }));
  },

  _initSlider() {
    import(flu.chunks.flickity).then(_ref => {
      var {
        Flickity
      } = _ref;
      var {
        timing
      } = this.container.dataset;
      slideshowOpts$1.autoPlay = parseInt(timing, 10);
      this.slideshow = new Flickity(this.sliderContainer, _objectSpread2(_objectSpread2({}, slideshowOpts$1), {}, {
        on: {
          // Need to add a modifier to animate after the first slide has changed
          change: index => {
            this.announcements.forEach((element, i) => {
              l(element, modifiers.active, i === index);
              element.setAttribute("aria-hidden", false);

              if (element.className.indexOf(modifiers.active) >= 0) {
                element.setAttribute("aria-hidden", true);
              }
            });
          }
        }
      }));
    });
  },

  _setRootVar(name, value) {
    document.documentElement.style.setProperty(name, "".concat(value, "px"));
  },

  _setUtilityBarVars() {
    document.documentElement.style.removeProperty(rootVars.utilityBar);

    this._setRootVar(rootVars.utilityBar, this.container.offsetHeight);

    r$1("sticky-header:reload", () => {});
  },

  _matchContentWidths() {
    // To keep our announcements fully centered we must ensure both elements
    // on either side are the same width.
    var socialContainer = n$3(selectors$s.socialContainer, this.container);
    var disclosureContainer = n$3(selectors$s.disclosureContainer, this.container);
    var socialWidth = socialContainer.offsetWidth;
    var disclosureWidth = disclosureContainer.offsetWidth;
    if (socialWidth === disclosureWidth) return;

    if (socialWidth > disclosureWidth) {
      disclosureContainer.setAttribute("style", "width:".concat(socialWidth, "px"));
    } else {
      socialContainer.setAttribute("style", "width:".concat(disclosureWidth, "px"));
    }
  },

  onBlockSelect(_ref2) {
    var {
      target
    } = _ref2;
    this.slideshow.pausePlayer();
    this.slideshow.select(target.dataset.index);
  },

  onBlockDeselect() {
    this.slideshow.unpausePlayer();
  },

  onUnload() {
    this.slideshow && this.slideshow.destroy();
    this.resizeObserver && this.resizeObserver.disconnect();
    Object.keys(this.crossBorder).forEach(t => {
      this.crossBorder[t].unload();
    });
  }

});

var selectors$r = {
  carousel: "[data-carousel]",
  slides: ".carousel__slide"
};
register("blog-posts", {
  onLoad() {
    this.slides = this.container.querySelectorAll(selectors$r.slides);
    this.carouselContainer = this.container.querySelector(selectors$r.carouselContainer);

    if (this.slides.length > 1) {
      this.carousel = carousel(this.container);
    }

    this.animateBlogPosts = animateBlogPosts(this.container);
  },

  onUnload() {
    var _this$animateBlogPost;

    (_this$animateBlogPost = this.animateBlogPosts) === null || _this$animateBlogPost === void 0 ? void 0 : _this$animateBlogPost.destroy();
    this.carousel && this.carousel.unload();
  }

});

var selectors$q = {
  itemTrigger: ".collapsible-row-list-item__label"
};
register("collapsible-row-list", {
  onLoad() {
    this.animateCollapsibleRowList = animateCollapsibleRowList(this.container);
    this.items = t$6(selectors$q.itemTrigger, this.container);
    this.clickHandlers = e$3(this.items, "click", e => {
      e.preventDefault();
      var {
        parentNode: group,
        nextElementSibling: content
      } = e.currentTarget;

      if (isVisible(content)) {
        this._close(e.currentTarget, group, content);
      } else {
        this._open(e.currentTarget, group, content);
      }
    });
  },

  _open(label, group, content) {
    slideStop(content);
    slideDown(content);
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  },

  _close(label, group, content) {
    slideStop(content);
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },

  onBlockSelect(_ref) {
    var {
      target
    } = _ref;
    var label = qs(selectors$q.itemTrigger, target);
    var {
      parentNode: group,
      nextElementSibling: content
    } = label;

    this._open(label, group, content);
  },

  onUnload() {
    var _this$animateCollapsi;

    (_this$animateCollapsi = this.animateCollapsibleRowList) === null || _this$animateCollapsi === void 0 ? void 0 : _this$animateCollapsi.destroy();
    this.clickHandlers();
  }

});

var selectors$p = {
  carousel: "[data-carousel]"
};
register("collection-list", {
  onLoad() {
    this.carouselContainer = this.container.querySelector(selectors$p.carouselContainer);
    this.carousel = carousel(this.container);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
  }

});

register("collection-list-grid", {
  onLoad() {
    this.animateCollectionListGrid = animateCollectionListGrid(this.container);
  },

  onUnload() {
    var _this$animateCollecti;

    (_this$animateCollecti = this.animateCollectionListGrid) === null || _this$animateCollecti === void 0 ? void 0 : _this$animateCollecti.destroy();
  }

});

register("custom-content", {
  onLoad() {},

  onUnload() {}

});

var selectors$o = {
  carouselContainer: ".featured-collection__slides"
};
register("featured-collection", {
  onLoad() {
    this.carouselContainer = this.container.querySelector(selectors$o.carouselContainer);
    this.carousel = carousel(this.container);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
  }

});

register("featured-collection-grid", {
  onLoad() {
    this.animateFeaturedCollectionGrid = animateFeaturedCollectionGrid(this.container);
  },

  onUnload() {
    var _this$animateFeatured;

    (_this$animateFeatured = this.animateFeaturedCollectionGrid) === null || _this$animateFeatured === void 0 ? void 0 : _this$animateFeatured.destroy();
  }

});

var selectors$n = {
  carouselContainer: ".featured-collection-row__slides"
};
register("featured-collection-row", {
  onLoad() {
    this.carouselContainer = this.container.querySelector(selectors$n.carouselContainer);
    this.carousel = carousel(this.container);
    this.animateFeaturedCollectionRow = animateFeaturedCollectionRow(this.container);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    var _this$animateFeatured;

    this.carousel.unload();
    (_this$animateFeatured = this.animateFeaturedCollectionRow) === null || _this$animateFeatured === void 0 ? void 0 : _this$animateFeatured.destroy();
  }

});

function Media(node) {
  if (!node) return;
  var {
    Shopify,
    YT
  } = window;
  var elements = t$6("[data-interactive]", node);
  if (!elements.length) return;
  var acceptedTypes = ["video", "model", "external_video"];
  var activeMedia = null;
  var featuresLoaded = false;
  var instances = {};

  if (featuresLoaded) {
    elements.forEach(initElement);
  }

  window.Shopify.loadFeatures([{
    name: "model-viewer-ui",
    version: "1.0"
  }, {
    name: "shopify-xr",
    version: "1.0"
  }, {
    name: "video-ui",
    version: "1.0"
  }], () => {
    featuresLoaded = true;

    if ("YT" in window && Boolean(YT.loaded)) {
      elements.forEach(initElement);
    } else {
      window.onYouTubeIframeAPIReady = function () {
        elements.forEach(initElement);
      };
    }
  });

  function initElement(el) {
    var {
      mediaId,
      mediaType
    } = el.dataset;
    if (!mediaType || !acceptedTypes.includes(mediaType)) return;
    if (Object.keys(instances).includes(mediaId)) return;
    var instance = {
      id: mediaId,
      type: mediaType,
      container: el,
      media: el.children[0]
    };

    switch (instance.type) {
      case "video":
        instance.player = new Shopify.Plyr(instance.media, {
          loop: {
            active: el.dataset.loop == "true"
          }
        });
        break;

      case "external_video":
        instance.player = new YT.Player(instance.media);
        break;

      case "model":
        instance.viewer = new Shopify.ModelViewerUI(n$3("model-viewer", el));
        e$3(n$3(".model-poster", el), "click", e => {
          e.preventDefault();
          playModel(instance);
        });
        break;
    }

    instances[mediaId] = instance;

    if (instance.player) {
      if (instance.type === "video") {
        instance.player.on("playing", () => {
          pauseActiveMedia(instance);
          activeMedia = instance;
        });
      } else if (instance.type === "external_video") {
        instance.player.addEventListener("onStateChange", event => {
          if (event.data === 1) {
            pauseActiveMedia(instance);
            activeMedia = instance;
          }
        });
      }
    }
  }

  function playModel(instance) {
    pauseActiveMedia(instance);
    instance.viewer.play();
    u$2(instance.container, "model-active");
    activeMedia = instance;
    setTimeout(() => {
      n$3("model-viewer", instance.container).focus();
    }, 300);
  }

  function pauseActiveMedia(instance) {
    if (!activeMedia || instance == activeMedia) return;

    if (activeMedia.player) {
      if (activeMedia.type === "video") {
        activeMedia.player.pause();
      } else if (activeMedia.type === "external_video") {
        activeMedia.player.pauseVideo();
      }

      activeMedia = null;
      return;
    }

    if (activeMedia.viewer) {
      i$1(activeMedia.container, "model-active");
      activeMedia.viewer.pause();
      activeMedia = null;
    }
  }

  return {
    pauseActiveMedia
  };
}

var selectors$m = {
  variantPopupTrigger: "[data-variant-popup-trigger]"
};

var variantPopup = node => {
  var delegate = new Delegate(node);

  var _variantPopupHandler = e => {
    e.preventDefault();
    var {
      modalContentId
    } = e.target.dataset;
    var moreInfoContent = n$3("#".concat(modalContentId), node);
    e.target.setAttribute("aria-expanded", true);
    r$1("modal:open", null, {
      modalContent: moreInfoContent
    });
  };

  var unload = () => {
    delegate.destroy();
  };

  delegate.on("click", selectors$m.variantPopupTrigger, _variantPopupHandler);
  return {
    unload
  };
};

theme;

var reviewsDrawer = node => {
  var closeBtn = node.querySelector("[data-reviews-close]");
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  closeBtn.addEventListener("click", close); // const starRating = node.querySelector(selectors.stars);
  // const totalReviewsContainer = node.querySelector(
  //   selectors.totalReviewsContainer
  // );
  // let totalReviews = strings.product.write_review;
  // if (totalReviewsContainer) {
  //   const totalReviewsString = totalReviewsContainer.innerText;
  //   totalReviews = `${totalReviewsString.match(/\d+/g)} ${
  //     strings.product.total_reviews
  //   }`;
  // }
  // emit(events.reviews.added, () => ({
  //   starRating,
  //   totalReviews,
  // }));

  var overlayHideListener = c$1("drawerOverlay:hiding", () => close(false));
  window.addEventListener("keydown", handleKeyboard);

  function handleKeyboard(e) {
    if (!node.classList.contains("is-visible")) return;

    if (e.key == "Escape" || e.keyCode === 27 && drawerOpen) {
      close();
    }
  }

  var open = () => {
    node.classList.add("is-visible");
    r$1("drawerOverlay:show");
    var reviewsToggle = node.querySelector(".spr-summary-actions-togglereviews");

    if (reviewsToggle) {
      reviewsToggle.tabIndex = -1;
    }

    setTimeout(() => {
      focusTrap.activate();
    }, 50);
  };

  var close = function close() {
    var hideOverlay = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
    hideOverlay && r$1("drawerOverlay:hide");
    node.classList.remove("is-visible");
    setTimeout(() => {
      focusTrap.deactivate();
    }, 50);
  };

  var unload = () => {
    closeBtn.removeEventListener("click", close());
    overlayHideListener();
  };

  return {
    unload,
    open
  };
};

var selectors$l = {
  reviewsFlyout: "[data-reviews-drawer]",
  reviewsContainers: ".product__reviews",
  reviewStars: ".product__reviews-stars",
  reviewsTriggers: ".product__reviews-trigger"
};

var reviews = function reviews(node) {
  var isDrawer = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  node.querySelectorAll(selectors$l.reviewsContainers);
  var reviewsFlyout = node.querySelector(selectors$l.reviewsFlyout);
  var reviewsTriggers = node.querySelectorAll(selectors$l.reviewsTriggers);

  var _handleReviewsTrigger = e => {
    e.preventDefault();

    if (drawer) {
      drawer.open();
    } else {
      var reviewsContainer = document.querySelector("#shopify-product-reviews");

      if (reviewsContainer) {
        reviewsContainer.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }
  }; // const _addReviewStars = stars => {
  //   reviewsContainers.forEach(container => {
  //     const reviewStars = container.querySelector(selectors.reviewStars);
  //     if (stars) {
  //       const starRating = stars.cloneNode(true);
  //       reviewStars.classList.remove('hidden');
  //       reviewStars.appendChild(starRating);
  //     }
  //   });
  // };
  // const _addReviewDrawerTrigger = totalReviews => {
  //   reviewsTriggers.forEach(trigger => {
  //     trigger.style.display = '';
  //     trigger.innerText = totalReviews;
  //   });
  // };


  reviewsTriggers.forEach(trigger => {
    trigger.addEventListener("click", _handleReviewsTrigger);
  }); // const reviewsListener = on(
  //   events.reviews.added,
  //   ({ starRating, totalReviews }) => {
  //     _addReviewDrawerTrigger(totalReviews);
  //     _addReviewStars(starRating);
  //     reviewsContainers.forEach(container => {
  //       container.classList.remove('hidden');
  //     });
  //   }
  // );

  var drawer = null;

  if (isDrawer) {
    drawer = reviewsDrawer(reviewsFlyout);
  }

  var unload = () => {
    // reviewsListener();
    drawer && drawer.unload();
    reviewsTriggers.forEach(trigger => {
      trigger.removeEventListener("click", _handleReviewsTrigger);
    });
  };

  return {
    unload
  };
};

theme;
var selectors$k = {
  swatches: "[data-product-swatches]",
  chips: "[data-product-chips]",
  quantityInput: ".product-form__quantity",
  socialSharing: ".share",
  productDetailsWrapper: ".product__meta-inner",
  productDescription: ".product__description",
  productForm: "[data-product-form]"
};
register("featured-product", {
  onLoad() {
    this.media = Media(this.container);
    var productFormContainer = this.container.querySelector(selectors$k.productForm);

    if (productFormContainer) {
      this.productForm = productForm(productFormContainer, {
        isProductPage: false,
        isFeaturedProduct: true,
        container: this.container
      });
      this.optionButtons = OptionButtons(t$6("[data-option-buttons]", this.container));
      this.quantityInput = quantityInput.call(this, selectors$k.quantityInput);
      this.variantPopup = variantPopup(this.container);
    }

    this.productDetails = this.container.querySelector(selectors$k.productDetailsWrapper);
    this.animateProduct = animateProduct(this.container); // Here we check if the merchant added a product reviews section or not

    var reviewsTemplate = this.container.querySelector(".product-reviews-template");
    var reviewsDrawer = this.container.querySelector("[data-reviews-drawer]");
    var reviewsIsDrawer = false;

    if (reviewsTemplate && reviewsDrawer) {
      reviewsDrawer.classList.add("reviews-flyout--active");
      reviewsDrawer.appendChild(reviewsTemplate.content.cloneNode(true));
      reviewsIsDrawer = true;
    }

    window.SPRCallbacks = {};

    window.SPRCallbacks.onReviewsLoad = () => {
      if (!this.reviews) {
        this.reviews = reviews(this.container, reviewsIsDrawer);
      }
    };

    this.accordions = this.container.querySelectorAll(selectors$k.accordion);
    this.accordions.forEach(item => {
      if (!item.classList.contains("accordion--active")) {
        accordion(item);
      }
    });
    this.socialButtons = t$6("[data-social-share]", this.container);
    this.socialButtonsClick = e$3(this.socialButtons, "click", e => {
      l(e.target, "active");
      var sub = n$3(".product__share-icons", e.target);
      sub.setAttribute("aria-hidden", !e.target.classList.contains("active"));
    }); // Handle dynamic variant options

    this.variantAvailability = variantAvailability(this.container);
  },

  onUnload() {
    var _this$variantAvailabi, _this$animateProduct;

    this.quantityInput && this.quantityInput();
    this.productForm && this.productForm.unload();
    this.variantPopup && this.variantPopup.unload();
    this.optionButtons.destroy();
    (_this$variantAvailabi = this.variantAvailability) === null || _this$variantAvailabi === void 0 ? void 0 : _this$variantAvailabi.unload();
    (_this$animateProduct = this.animateProduct) === null || _this$animateProduct === void 0 ? void 0 : _this$animateProduct.destroy();
  }

});

var {
  strings: {
    accessibility: strings$1
  }
} = theme;

var focusFormStatus = node => {
  var formStatus = n$3(selectors$1j.a11y.formStatus, node);
  if (!formStatus) return;
  var focusElement = n$3("[data-form-status]", formStatus);
  focusElement.focus();
};

var prefersReducedMotion = () => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

function backgroundVideoHandler(container) {
  var pause = n$3(".video-pause", container);
  var video = container.getElementsByTagName("VIDEO")[0];
  if (!pause || !video) return;
  var pauseListener = e$3(pause, "click", e => {
    e.preventDefault();

    if (video.paused) {
      video.play();
      pause.innerText = strings$1.pause_video;
    } else {
      video.pause();
      pause.innerText = strings$1.play_video;
    }
  });
  return () => pauseListener();
}

var selectors$j = {
  video: ".image-with-text__video"
};
register("image-with-text", {
  videoHandler: null,

  onLoad() {
    this.animateImageWithText = animateImageWithText(this.container);
    var videoWrapper = this.container.querySelector(selectors$j.video);

    if (videoWrapper) {
      this.videoHandler = backgroundVideoHandler(this.container);
    }
  },

  onUnload() {
    var _this$animateImageWit;

    (_this$animateImageWit = this.animateImageWithText) === null || _this$animateImageWit === void 0 ? void 0 : _this$animateImageWit.destroy();
    this.videoHandler && this.videoHandler();
  }

});

register("image-with-text-split", {
  onLoad() {
    this.animateImageWithTextSplit = animateImageWithTextSplit(this.container);
  },

  onUnload() {
    var _this$animateImageWit;

    (_this$animateImageWit = this.animateImageWithTextSplit) === null || _this$animateImageWit === void 0 ? void 0 : _this$animateImageWit.destroy();
  }

});

register("newsletter", {
  onLoad() {
    this.animateNewsletter = animateNewsletter(this.container);
    focusFormStatus(this.container);
  },

  onUnload() {
    var _this$animateNewslett;

    (_this$animateNewslett = this.animateNewsletter) === null || _this$animateNewslett === void 0 ? void 0 : _this$animateNewslett.destroy();
  }

});

register("product-recommendations", {
  onLoad() {
    this._getProductRecommendations();
  },

  _getProductRecommendations() {
    var {
      sectionId,
      productId,
      limit
    } = this.container.dataset; // Build request URL

    var requestUrl = "".concat(window.theme.routes.productRecommendations, "?section_id=").concat(sectionId, "&limit=").concat(limit, "&product_id=").concat(productId); // Create request and submit it using Ajax

    var request = new XMLHttpRequest();
    request.open("GET", requestUrl, true);

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        var container = document.createElement("div");
        container.innerHTML = request.response;
        this.container.innerHTML = container.querySelector(".product-recommendations").innerHTML;

        this._initSlider();
      }
    };

    request.send();
  },

  _initSlider() {
    this.carousel = carousel(this.container);
  },

  onUnload() {
    this.carousel.unload();
  }

});

var selectors$i = {
  hotspotWrappers: ".shoppable-item",
  hotspots: ".shoppable-item__hotspot",
  productCard: ".shoppable-item__product-card",
  closeButtons: "[data-shoppable-item-close]"
};
var classes$4 = {
  animating: "shoppable-item--animating",
  unset: "shoppable-item--position-unset",
  hidden: "hidden",
  active: "active"
};
register("shoppable", {
  onLoad() {
    this.productCards = t$6(selectors$i.productCard, this.container);
    this.hotspotContainers = t$6(selectors$i.hotspotWrappers, this.container);
    this.hotspots = t$6(selectors$i.hotspots, this.container);
    var closeButtons = t$6(selectors$i.closeButtons, this.container); // Self terminating mouseenter events

    this.hotspotEvents = this.hotspots.map(hotspot => {
      return {
        element: hotspot,
        event: e$3(hotspot, "mouseenter", e => {
          i$1(e.currentTarget.parentNode, classes$4.animating);
          this.hotspotEvents.find(o => o.element === hotspot).event();
        })
      };
    });
    this.events = [e$3(this.hotspots, "click", e => this._hotspotClickHandler(e)), e$3(document, "click", e => this._clickOutsideHandler(e)), e$3(closeButtons, "click", () => this._closeAll()), e$3(this.container, "keydown", _ref => {
      var {
        keyCode
      } = _ref;
      if (keyCode === 27) this._closeAll();
    })];
    this.animateShoppable = animateShoppable(this.container);
  },

  _hotspotClickHandler(e) {
    var hotspot = e.currentTarget;
    var wrapper = e.currentTarget.parentNode.parentNode;
    var card = e.currentTarget.parentNode.nextElementSibling;
    if (!card) return;

    if (a$1(card, "hidden")) {
      var cardHeight = card.offsetHeight;
      var cardWidth = card.offsetWidth;

      this._closeAll();

      card.setAttribute("aria-hidden", false);
      card.style.setProperty("--card-height", cardHeight + "px");
      card.style.setProperty("--card-width", cardWidth + "px");
      i$1(card, classes$4.hidden);
      u$2(wrapper, classes$4.active);
      i$1(wrapper, classes$4.unset);
      u$2(this.container, classes$4.flyupActive); // Offset flyup height and scroll hotspot into view

      if (!window.matchMedia("(min-width: 45em)").matches) {
        var hotspotOffsetMargin = 70;
        var hotspotOffsetTop = hotspot.getBoundingClientRect().top;
        var positionFromBottom = window.innerHeight - (hotspotOffsetTop + hotspotOffsetMargin);

        if (cardHeight > positionFromBottom) {
          var y = window.pageYOffset + cardHeight - positionFromBottom;
          window.scrollTo({
            top: y,
            behavior: "smooth"
          });
        }
      }
    } else {
      card.setAttribute("aria-hidden", true);
      u$2(card, classes$4.hidden);
      i$1(this.container, classes$4.flyupActive);
      i$1(wrapper, classes$4.active);
    }
  },

  _clickOutsideHandler(e) {
    if (!e.target.closest(selectors$i.productCard) && !a$1(e.target, "shoppable-item__hotspot")) {
      this._closeAll();
    }
  },

  _closeAll() {
    this.productCards.forEach(card => {
      u$2(card, classes$4.hidden);
      card.setAttribute("aria-hidden", true);
    });
    this.hotspotContainers.forEach(spot => i$1(spot, classes$4.active));
    i$1(this.container, classes$4.flyupActive);
  },

  onUnload() {
    var _this$animateShoppabl;

    this.events.forEach(unsubscribe => unsubscribe());
    (_this$animateShoppabl = this.animateShoppable) === null || _this$animateShoppabl === void 0 ? void 0 : _this$animateShoppabl.destroy();
  }

});

var isFirstSectionOnHomepage = node => {
  var body = document.body;
  if (!body.classList.contains("template-index")) return;
  var firstSection = body.querySelector(".section-dynamic");
  var sectionParent = node.parentNode;
  if (firstSection === sectionParent) r$1("section:first-full-height");
  return firstSection === sectionParent;
};

var selectors$h = {
  dots: ".page-dot"
};

var pageDots = (container, slider, slideCount) => {
  var pageDots = t$6(selectors$h.dots, container);
  var events = [];
  pageDots.forEach(dot => {
    events.push(e$3(dot, "click", e => _handlePageDot(e)));
  });

  var _handlePageDot = e => {
    e.preventDefault();
    if (e.target.classList.contains("is-selected")) return; // 3 or more page dots is handled differently than 2 due to having
    // to load aditional slides because of transition animation

    if (slideCount > 2) {
      var {
        slideIndex
      } = e.target.dataset;
      slider.select(slideIndex);
      return;
    } // 2 slides actually loads 4 slides, however we are using
    // 2 page dots to fake only showing 2 slides.


    if (e.target.classList.contains("next")) {
      slider.next();
    } else {
      slider.previous();
    }
  };

  var update = cellIndex => {
    var activeClass = "is-selected";
    pageDots.forEach(dot => i$1(dot, activeClass));

    if (slideCount > 2) {
      u$2(pageDots[cellIndex], activeClass);
      return;
    }

    u$2(pageDots[cellIndex % 2], activeClass);
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    update,
    unload
  };
};

var selectors$g = {
  slideshow: ".js-slideshow",
  slide: ".slideshow__slide",
  images: ".slideshow__image",
  desktopImages: ".slideshow__image--desktop",
  mobileImages: ".slideshow__image--mobile:not(.slideshow__placeholder)",
  innerImage: ".image__img"
};
register("slideshow", {
  slideshow: null,
  events: [],

  onLoad() {
    this.slideshowContainer = n$3(selectors$g.slideshow, this.container);
    this.slides = t$6(selectors$g.slide, this.container);
    this.slideImages = this.slides.map(slide => {
      var slideImagesDesktop = n$3(selectors$g.desktopImages, slide);
      var slideImagesMobile = n$3(selectors$g.mobileImages, slide);
      return {
        mobile: slideImagesMobile ? slideImagesMobile : slideImagesDesktop,
        desktop: slideImagesDesktop
      };
    });
    var docStyle = document.documentElement.style;
    this.transformProp = typeof docStyle.transform == "string" ? "transform" : "WebkitTransform";

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, "first-full-height");
    }

    this._initSlideshow();
  },

  _initSlideshow() {
    import(flu.chunks.flickity).then(_ref => {
      var {
        Flickity
      } = _ref;
      var slideshowOpts = {
        percentPosition: true,
        wrapAround: true,
        prevNextButtons: false,
        adaptiveHeight: true,
        pageDots: false
      };
      var {
        timer,
        slideCount
      } = this.container.dataset;
      slideshowOpts.autoPlay = parseInt(timer);

      if (this.slides.length > 1) {
        this.slideshow = new Flickity(this.slideshowContainer, _objectSpread2({}, slideshowOpts));
        this.pageDots = pageDots(this.container, this.slideshow, slideCount);
        this.slideshow.on("scroll", () => {
          if (!prefersReducedMotion()) {
            this.slideshow.slides.forEach((slide, i) => {
              this._handleSlideScroll(slide, i);
            });
          }
        });
        this.slideshow.on("select", () => {
          this.pageDots.update(this.slideshow.selectedIndex);
        });
        this.navListener = e$3(this.container, "click", evt => {
          this._clickListener(evt, this.slideshow);
        });
      } else if (this.slides.length === 1) {
        this.slides[0].classList.add("is-selected");
      }

      this.animateSlideshow = animateSlideshow(this.container);
    });
  },

  _clickListener(evt, slideshow) {
    var {
      control
    } = evt.target.dataset;

    if (control === "next") {
      evt && evt.preventDefault();
      slideshow.next();
    } else if (control === "prev") {
      evt && evt.preventDefault();
      slideshow.previous();
    } else if (control === "pause") {
      evt && evt.preventDefault();

      if (slideshow.player.state === "playing") {
        slideshow.stopPlayer();
      } else {
        slideshow.playPlayer();
      }
    }
  },

  _handleSlideScroll(slide, index) {
    var img = this.slideImages[index].desktop;

    if (bp.isSmall()) {
      img = this.slideImages[index].mobile;
    }

    if (!img) return;
    var x = 0;

    if (index === 0) {
      x = Math.abs(this.slideshow.x) > this.slideshow.slidesWidth ? this.slideshow.slidesWidth + this.slideshow.x + this.slideshow.slides[this.slideshow.slides.length - 1].outerWidth + slide.target : slide.target + this.slideshow.x;
    } else if (index === this.slideshow.slides.length - 1) {
      x = Math.abs(this.slideshow.x) + this.slideshow.slides[index].outerWidth < this.slideshow.slidesWidth ? slide.target - this.slideshow.slidesWidth + this.slideshow.x - this.slideshow.slides[index].outerWidth : slide.target + this.slideshow.x;
    } else {
      x = slide.target + this.slideshow.x;
    }

    img.style[this.transformProp] = "translateX(" + x * -1 / 2 + "px)";
  },

  onUnload() {
    var _this$animateSlidesho;

    if (this.slideshow) {
      this.slideshow.destroy();
      this.pageDots.unload();
    }

    this.atBreakpointChange.unload();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$animateSlidesho = this.animateSlideshow) === null || _this$animateSlidesho === void 0 ? void 0 : _this$animateSlidesho.destroy();
  },

  onBlockSelect(_ref2) {
    var {
      target: slide
    } = _ref2;

    if (this.slideshow) {
      this.slideshow.pausePlayer();
      this.slideshow.select(slide.dataset.index, true, true);
    }
  },

  onBlockDeselect() {
    if (this.slideshow) {
      this.slideshow.unpausePlayer();
    }
  }

});

var selectors$f = {
  slideshow: ".slideshow-split__slideshow",
  slide: ".slideshow-split__slide",
  innerImage: ".image__img",
  underlay: ".slideshow-split__underlay",
  video: ".slideshow-split__video"
};
register("slideshow-split", {
  events: [],

  onLoad() {
    this.slideshowContainer = n$3(selectors$f.slideshow, this.container);
    this.slides = t$6(selectors$f.slide, this.container);
    this.videoElements = [];
    var underlay = n$3(selectors$f.underlay, this.container);

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, "first-full-height");
    }

    if (this.slides.length > 1) {
      this._initSlideshow();

      onImagesLoaded(this.container, () => underlay.classList.remove("hide"));
    }

    this.slides.forEach(item => {
      var videoWrapper = item.querySelector(selectors$f.video);

      if (videoWrapper) {
        this.events.push(backgroundVideoHandler(item));
        this.videoElements.push(videoWrapper);
      }
    });
    this.autoPlayListeners = [e$3(window, "click", () => this._handleAutoPlay()), e$3(window, "touchstart", () => this._handleAutoPlay())];
    this.observer = null;
  },

  _initSlideshow() {
    import(flu.chunks.flickity).then(_ref => {
      var {
        Flickity
      } = _ref;
      var slideshowOpts = {
        percentPosition: true,
        wrapAround: true,
        prevNextButtons: false,
        adaptiveHeight: false,
        pageDots: false,
        cellAlign: "left"
      };
      var {
        timer,
        slideCount
      } = this.container.dataset;
      slideshowOpts.autoPlay = parseInt(timer);
      this.slideshow = new Flickity(this.slideshowContainer, _objectSpread2({}, slideshowOpts));
      this.pageDots = pageDots(this.container, this.slideshow, slideCount);
      this.slideshow.on("select", () => {
        this.pageDots.update(this.slideshow.selectedIndex);
      });
      this.navListener = e$3(this.container, "click", evt => {
        this._clickListener(evt, this.slideshow);
      });
      this.animateSlideshowSplit = animateSlideshowSplit(this.container);
      setTimeout(() => {
        this.slideshow.resize();
      }, 100); // Pause slider until it is in view

      this.slideshow.stopPlayer();
      this.observer = new IntersectionObserver(_ref2 => {
        var [{
          isIntersecting: visible
        }] = _ref2;

        if (visible) {
          this.slideshow.playPlayer();
          this.observer.disconnect();
        }
      });
      this.observer.observe(this.container);
    });
  },

  _clickListener(evt, slideshow) {
    var {
      control
    } = evt.target.dataset;

    if (control === "next") {
      evt && evt.preventDefault();
      slideshow.next();
    } else if (control === "prev") {
      evt && evt.preventDefault();
      slideshow.previous();
    } else if (control === "pause") {
      evt && evt.preventDefault();

      if (slideshow.player.state === "playing") {
        slideshow.stopPlayer();
      } else {
        slideshow.playPlayer();
      }
    }
  },

  // Force autoplay after device interaction if in low power mode
  _handleAutoPlay() {
    this.videoElements.forEach(video => {
      if (!video.playing) {
        video.play();
      }
    });
    this.autoPlayListeners.forEach(unsubscribe => unsubscribe());
  },

  onUnload() {
    var _this$animateSlidesho, _this$observer;

    this.slideshow && this.slideshow.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$animateSlidesho = this.animateSlideshowSplit) === null || _this$animateSlidesho === void 0 ? void 0 : _this$animateSlidesho.destroy();
    (_this$observer = this.observer) === null || _this$observer === void 0 ? void 0 : _this$observer.disconnect();
  },

  onBlockSelect(_ref3) {
    var {
      target: slide
    } = _ref3;

    if (this.slideshow) {
      this.slideshow.pausePlayer();
      this.slideshow.select(slide.dataset.index);
    }
  },

  onBlockDeselect() {
    if (this.slideshow) {
      this.slideshow.unpausePlayer();
    }
  }

});

var selectors$e = {
  overlay: ".video__overlay",
  player: ".video__player",
  button: "[data-video-trigger]",
  wrapper: ".video__wrapper"
};
register("video", {
  videoType: null,
  videoPlayer: null,

  onLoad() {
    this._initPlayer();

    this.animateSectionIntroduction = animateSectionIntroduction(this.container);
  },

  _initPlayer() {
    import(flu.chunks.video).then(_ref => {
      var {
        Video
      } = _ref;
      var {
        videoId,
        videoType
      } = this.container.dataset;
      if (!videoId || !videoType) return;
      var overlay = this.container.querySelector(selectors$e.overlay);
      var player = this.container.querySelector(selectors$e.player);
      this.button = this.container.querySelector(selectors$e.button);
      this.video = Video(this.container, {
        id: videoId,
        type: videoType,
        playerEl: player
      });
      this.video.on("play", () => {
        overlay.classList.remove("visible");
      });
      this.button && this.button.addEventListener("click", this._playVideo.bind(this));
    });
  },

  _playVideo(e) {
    e.preventDefault();
    this.video.play();
  },

  onUnload() {
    var _this$animateSectionI;

    this.video && this.video.destroy();
    this.button && this.button.removeEventListener("click", this.video.play);
    (_this$animateSectionI = this.animateSectionIntroduction) === null || _this$animateSectionI === void 0 ? void 0 : _this$animateSectionI.destroy();
  }

});

var slideshowOpts = {
  prevNextButtons: false,
  adaptiveHeight: false,
  pauseAutoPlayOnHover: false,
  wrapAround: true,
  pageDots: false,
  cellAlign: "center",
  draggable: false,
  fade: true
};
register("quote", {
  listeners: [],

  onLoad() {
    import(flu.chunks.flickity).then(_ref => {
      var {
        Flickity
      } = _ref;
      var {
        timer
      } = this.container.dataset;
      slideshowOpts.autoPlay = parseInt(timer);
      var quoteContainer = n$3(".quote__container", this.container);
      this.slideshow = new Flickity(quoteContainer, slideshowOpts);

      this._initNavigation();

      this.animateQuote = animateQuote(this.container);
    });
  },

  _initNavigation() {
    var navNextButton = n$3(".carousel__next-button", this.container);
    var navPrevButton = n$3(".carousel__previous-button", this.container);
    this.listeners.push(e$3(navPrevButton, "click", () => this.slideshow.previous()));
    this.listeners.push(e$3(navNextButton, "click", () => this.slideshow.next()));
  },

  onBlockSelect(_ref2) {
    var {
      target: slide
    } = _ref2;
    this.slideshow.select(slide.dataset.index);
    this.slideshow.pausePlayer();
  },

  onBlockDeselect() {
    this.slideshow.unpausePlayer();
  },

  onUnload() {
    var _this$animateQuote;

    this.slideshow.destroy();
    this.listeners.forEach(unsub => unsub());
    (_this$animateQuote = this.animateQuote) === null || _this$animateQuote === void 0 ? void 0 : _this$animateQuote.destroy();
  }

});

var selectors$d = {
  carouselContainer: ".gallery__slides"
};
register("gallery", {
  onLoad() {
    this.carouselContainer = this.container.querySelector(selectors$d.carouselContainer);
    this.carousel = carousel(this.container);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
  }

});

var Google = {exports: {}};

(function (module, exports) {
(function(root, factory) {

	if (root === null) {
		throw new Error('Google-maps package can be used only in browser');
	}

	{
		module.exports = factory();
	}

})(typeof window !== 'undefined' ? window : null, function() {


	var googleVersion = '3.31';

	var script = null;

	var google = null;

	var loading = false;

	var callbacks = [];

	var onLoadEvents = [];

	var originalCreateLoaderMethod = null;


	var GoogleMapsLoader = {};


	GoogleMapsLoader.URL = 'https://maps.googleapis.com/maps/api/js';

	GoogleMapsLoader.KEY = null;

	GoogleMapsLoader.LIBRARIES = [];

	GoogleMapsLoader.CLIENT = null;

	GoogleMapsLoader.CHANNEL = null;

	GoogleMapsLoader.LANGUAGE = null;

	GoogleMapsLoader.REGION = null;

	GoogleMapsLoader.VERSION = googleVersion;

	GoogleMapsLoader.WINDOW_CALLBACK_NAME = '__google_maps_api_provider_initializator__';


	GoogleMapsLoader._googleMockApiObject = {};


	GoogleMapsLoader.load = function(fn) {
		if (google === null) {
			if (loading === true) {
				if (fn) {
					callbacks.push(fn);
				}
			} else {
				loading = true;

				window[GoogleMapsLoader.WINDOW_CALLBACK_NAME] = function() {
					ready(fn);
				};

				GoogleMapsLoader.createLoader();
			}
		} else if (fn) {
			fn(google);
		}
	};


	GoogleMapsLoader.createLoader = function() {
		script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = GoogleMapsLoader.createUrl();

		document.body.appendChild(script);
	};


	GoogleMapsLoader.isLoaded = function() {
		return google !== null;
	};


	GoogleMapsLoader.createUrl = function() {
		var url = GoogleMapsLoader.URL;

		url += '?callback=' + GoogleMapsLoader.WINDOW_CALLBACK_NAME;

		if (GoogleMapsLoader.KEY) {
			url += '&key=' + GoogleMapsLoader.KEY;
		}

		if (GoogleMapsLoader.LIBRARIES.length > 0) {
			url += '&libraries=' + GoogleMapsLoader.LIBRARIES.join(',');
		}

		if (GoogleMapsLoader.CLIENT) {
			url += '&client=' + GoogleMapsLoader.CLIENT;
		}

		if (GoogleMapsLoader.CHANNEL) {
			url += '&channel=' + GoogleMapsLoader.CHANNEL;
		}

		if (GoogleMapsLoader.LANGUAGE) {
			url += '&language=' + GoogleMapsLoader.LANGUAGE;
		}

		if (GoogleMapsLoader.REGION) {
			url += '&region=' + GoogleMapsLoader.REGION;
		}

		if (GoogleMapsLoader.VERSION) {
			url += '&v=' + GoogleMapsLoader.VERSION;
		}

		return url;
	};


	GoogleMapsLoader.release = function(fn) {
		var release = function() {
			GoogleMapsLoader.KEY = null;
			GoogleMapsLoader.LIBRARIES = [];
			GoogleMapsLoader.CLIENT = null;
			GoogleMapsLoader.CHANNEL = null;
			GoogleMapsLoader.LANGUAGE = null;
			GoogleMapsLoader.REGION = null;
			GoogleMapsLoader.VERSION = googleVersion;

			google = null;
			loading = false;
			callbacks = [];
			onLoadEvents = [];

			if (typeof window.google !== 'undefined') {
				delete window.google;
			}

			if (typeof window[GoogleMapsLoader.WINDOW_CALLBACK_NAME] !== 'undefined') {
				delete window[GoogleMapsLoader.WINDOW_CALLBACK_NAME];
			}

			if (originalCreateLoaderMethod !== null) {
				GoogleMapsLoader.createLoader = originalCreateLoaderMethod;
				originalCreateLoaderMethod = null;
			}

			if (script !== null) {
				script.parentElement.removeChild(script);
				script = null;
			}

			if (fn) {
				fn();
			}
		};

		if (loading) {
			GoogleMapsLoader.load(function() {
				release();
			});
		} else {
			release();
		}
	};


	GoogleMapsLoader.onLoad = function(fn) {
		onLoadEvents.push(fn);
	};


	GoogleMapsLoader.makeMock = function() {
		originalCreateLoaderMethod = GoogleMapsLoader.createLoader;

		GoogleMapsLoader.createLoader = function() {
			window.google = GoogleMapsLoader._googleMockApiObject;
			window[GoogleMapsLoader.WINDOW_CALLBACK_NAME]();
		};
	};


	var ready = function(fn) {
		var i;

		loading = false;

		if (google === null) {
			google = window.google;
		}

		for (i = 0; i < onLoadEvents.length; i++) {
			onLoadEvents[i](google);
		}

		if (fn) {
			fn(google);
		}

		for (i = 0; i < callbacks.length; i++) {
			callbacks[i](google);
		}

		callbacks = [];
	};


	return GoogleMapsLoader;

});
}(Google));

var GoogleMapsLoader = Google.exports;

var selectors$c = {
  mapContainer: ".location__map-container",
  mapElement: ".location__map-element"
};
var fullMapURL = "https://www.google.com/maps/place/";
register("location", {
  onLoad() {
    this._initMap();
  },

  _initMap() {
    this.animateLocation = animateLocation(this.container);
    this.mapContainer = this.container.querySelector(selectors$c.mapContainer);
    var address = null;
    var apiKey = null;

    if (this.mapContainer) {
      address = this.mapContainer.dataset.address;
      apiKey = this.mapContainer.dataset.apiKey;
    }

    if (!apiKey || !address) {
      return;
    }

    var {
      sectionId
    } = this.container.dataset;
    var styledData = document.querySelector("#map-styles-".concat(sectionId));
    var data = JSON.parse(styledData.innerHTML);
    GoogleMapsLoader.KEY = apiKey;
    GoogleMapsLoader.VERSION = "3.34";
    GoogleMapsLoader.LIBRARIES = ["geocoding-api"];
    GoogleMapsLoader.load(google => {
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({
        address
      }, (res, status) => {
        if (res.length === 0) {
          return console.error("Google Maps Geocoding failed, reason: ".concat(status));
        }

        var {
          location
        } = res[0].geometry;
        var latLong = {
          lat: location.lat(),
          lng: location.lng()
        };
        this.mapContainer.classList.add("active");
        var map = new google.maps.Map(this.container.querySelector(selectors$c.mapElement), {
          center: latLong,
          zoom: 12,
          styles: data.styles
        });
        var marker = new google.maps.Marker({
          position: latLong,
          map
        });
        marker.addListener("click", () => {
          window.open(fullMapURL + address);
        });
      });
    });
  },

  onUnload() {
    var _this$animateLocation;

    GoogleMapsLoader.release();
    (_this$animateLocation = this.animateLocation) === null || _this$animateLocation === void 0 ? void 0 : _this$animateLocation.destroy();
  }

});

var selectors$b = {
  carouselContainer: ".testimonials__slides"
};
register("testimonials", {
  onLoad() {
    this.carouselContainer = this.container.querySelector(selectors$b.carouselContainer);
    this.carousel = carousel(this.container);
  },

  onBlockSelect(_ref) {
    var {
      target: slide
    } = _ref;
    this.carousel.goToSlide(slide.dataset.index);
  },

  onUnload() {
    this.carousel.unload();
  }

});

var selectors$a = {
  video: ".mosaic-grid__item-video"
};
register("mosaic-grid-2-column", {
  onLoad() {
    this.animateMosaicGrid = animateMosaicGrid(this.container);
    var videos = t$6(selectors$a.video, this.container);
    this.videoHandlers = [];

    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
      });
    }
  },

  onUnload() {
    var _this$animateMosaicGr;

    (_this$animateMosaicGr = this.animateMosaicGrid) === null || _this$animateMosaicGr === void 0 ? void 0 : _this$animateMosaicGr.destroy();
    this.videoHandlers.forEach(handler => handler());
  }

});

var selectors$9 = {
  video: ".mosaic-grid__item-video"
};
register("mosaic-grid", {
  onLoad() {
    this.animateMosaicGrid = animateMosaicGrid(this.container);
    var videos = t$6(selectors$9.video, this.container);
    this.videoHandlers = [];

    if (videos.length) {
      videos.forEach(video => {
        this.videoHandlers.push(backgroundVideoHandler(video.parentNode));
      });
    }
  },

  onUnload() {
    var _this$animateMosaicGr;

    (_this$animateMosaicGr = this.animateMosaicGrid) === null || _this$animateMosaicGr === void 0 ? void 0 : _this$animateMosaicGr.destroy();
    this.videoHandlers.forEach(handler => handler());
  }

});

register("text-columns-with-images", {
  onLoad() {
    this.animateTextColumnsWithImages = animateTextColumnsWithImages(this.container);
  },

  onUnload() {
    var _this$animateTextColu;

    (_this$animateTextColu = this.animateTextColumnsWithImages) === null || _this$animateTextColu === void 0 ? void 0 : _this$animateTextColu.destroy();
  }

});

register("rich-text", {
  onLoad() {
    this.animateSectionIntroduction = animateSectionIntroduction(this.container);
  },

  onUnload() {
    var _this$animateSectionI;

    (_this$animateSectionI = this.animateSectionIntroduction) === null || _this$animateSectionI === void 0 ? void 0 : _this$animateSectionI.destroy();
  }

});

register("image-hero", {
  onLoad() {
    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, "first-full-height");
    }

    this.animateImageHero = animateImageHero(this.container);
  },

  onUnload() {
    var _this$animateImageHer;

    (_this$animateImageHer = this.animateImageHero) === null || _this$animateImageHer === void 0 ? void 0 : _this$animateImageHer.destroy();
  }

});

var autoPlay = videos => {
  if (!videos.length) return;
  var events = [e$3(window, 'click', () => _handleAutoPlay()), e$3(window, 'touchstart', () => _handleAutoPlay())]; // Force autoplay after device interaction if in low power mode

  function _handleAutoPlay() {
    videos.forEach(video => {
      if (!video.playing) {
        video.play();
      }
    });
    events.forEach(unsubscribe => unsubscribe());
  }
};

var selectors$8 = {
  videoWrapper: ".video-hero__video"
};
register("video-hero", {
  onLoad() {
    var videoWrapper = t$6(selectors$8.videoWrapper, this.container);

    if (isFirstSectionOnHomepage(this.container)) {
      u$2(this.container, "first-full-height");
    }

    if (videoWrapper) {
      this.videoHandler = backgroundVideoHandler(this.container);
      autoPlay(videoWrapper);
    }

    this.animateVideoHero = animateVideoHero(this.container);
  },

  onUnload() {
    var _this$animateVideoHer;

    this.videoHandler && this.videoHandler();
    (_this$animateVideoHer = this.animateVideoHero) === null || _this$animateVideoHer === void 0 ? void 0 : _this$animateVideoHer.destroy();
  }

});

register("collection-banner", {
  videoHandler: null,

  onLoad() {
    this.animateCollectionBanner = animateCollectionBanner(this.container);
  },

  onUnload() {
    var _this$animateCollecti;

    (_this$animateCollecti = this.animateCollectionBanner) === null || _this$animateCollecti === void 0 ? void 0 : _this$animateCollecti.destroy();
  }

});

register("article", {
  onLoad() {
    this.socialButtons = t$6("[data-social-share]", this.container);
    this.socialButtonsClick = e$3(this.socialButtons, "click", e => {
      l(e.target, "active");
      var sub = n$3(".product__share-icons", e.target);
      sub.setAttribute("aria-hidden", !e.target.classList.contains("active"));
    });
    this.animateArticle = animateArticle(this.container);
  },

  onUnload() {
    var _this$animateArticle;

    this.socialButtonsClick();
    (_this$animateArticle = this.animateArticle) === null || _this$animateArticle === void 0 ? void 0 : _this$animateArticle.destroy();
  }

});

var selectors$7 = {
  cartItems: "[data-cart-items]",
  cartInfo: "[data-cart-info]",
  quantityInput: "[data-quantity-input]",
  quantityButton: "[data-quantity-button]",
  quantityWrapper: "[data-quantity-wrapper]",
  loading: "[data-loading]"
};
register("cart", {
  onLoad() {
    this.dynamicCartEnabled = this.container.dataset.dynamicCartEnabled;
    this.cartItems = this.container.querySelector(selectors$7.cartItems);
    this.cartInfo = this.container.querySelector(selectors$7.cartInfo);
    this.loading = this.container.querySelector(selectors$7.loading);
    this.delegate = new Delegate(this.container);
    this.delegate.on("click", selectors$7.quantityButton, this._handleQuantityButton);
    this.delegate.on("change", selectors$7.quantityInput, evt => {
      this._handleQuantitychange(evt);
    });
  },

  _handleQuantitychange(evt) {
    var key = evt.target.dataset.lineItemKey;
    var quantity = parseInt(evt.target.value);
    var inventoryQuantity = parseInt(evt.target.dataset.inventoryQuantity);
    var inventoryManagement = evt.target.dataset.inventoryManagement;

    if (this.dynamicCartEnabled === "true") {
      this._updateLineItemQuantity(key, quantity).then(() => {
        this._renderView().then(() => {
          if (inventoryManagement === "shopify" && quantity > inventoryQuantity) {
            var quantityInput = this.container.querySelector("".concat(selectors$7.quantityInput, "[data-line-item-key='").concat(key, "']"));
            quantityInput.setCustomValidity("".concat(theme.strings.cart.general.quantity_error_updated, " ").concat(quantity, " \u2192 ").concat(inventoryQuantity));
            quantityInput.reportValidity();
          }
        });
      });
    } else {
      if (inventoryManagement === "shopify" && quantity > inventoryQuantity) {
        var quantityInput = this.container.querySelector("".concat(selectors$7.quantityInput, "[data-line-item-key='").concat(key, "']"));
        quantityInput.setCustomValidity(theme.strings.cart.general.quantity_error);
        quantityInput.reportValidity();
      }
    }
  },

  _handleQuantityButton(evt) {
    var {
      quantityButton
    } = evt.target.closest(selectors$7.quantityButton).dataset;
    var quantityWrapper = evt.target.closest(selectors$7.quantityWrapper);
    var quantityInput = quantityWrapper.querySelector(selectors$7.quantityInput);
    var currentValue = parseInt(quantityInput.value);
    var newValue = currentValue;

    if (quantityButton === "subtract") {
      newValue = currentValue - 1;
    } else if (quantityButton === "add") {
      newValue = currentValue + 1;
    }

    quantityInput.value = newValue;
    quantityInput.dispatchEvent(new Event("change", {
      "bubbles": true
    }));
  },

  _updateLineItemQuantity(id, quantity) {
    var _this = this;

    return _asyncToGenerator(function* () {
      _this.loading.classList.add("is-active");

      return fetch("".concat(theme.routes.cart.change, ".js"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id,
          quantity
        })
      }).then(res => res.json());
    })();
  },

  _renderView() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      var url = "".concat(window.location.pathname, "?section_id=").concat(_this2.container.dataset.sectionId);
      return fetch(url, {
        credentials: "include"
      }).then(res => res.text()).then(res => {
        var doc = new window.DOMParser().parseFromString(res, "text/html");
        var items = doc.querySelector(selectors$7.cartItems).innerHTML;
        _this2.cartItems.innerHTML = items;
        var info = doc.querySelector(selectors$7.cartInfo).innerHTML;
        _this2.cartInfo.innerHTML = info;
        return fetchCart().then(cart => {
          o({
            cart: cart
          });
          r$1("cart:updated", {
            cartOpen: true,
            cart: cart
          });

          _this2.loading.classList.remove("is-active");

          return {
            cart
          };
        });
      });
    })();
  },

  onUnload() {
    this.delegate.off();
  }

});

var selectors$6 = {
  close: "[data-close]",
  slider: "[data-slider]",
  slide: "[data-slide]",
  imageById: id => "[data-id='".concat(id, "']"),
  navItem: "[data-nav-item]",
  wrapper: ".lightbox__images-wrapper",
  prevButton: "[data-prev]",
  nextButton: "[data-next]"
};
var classes$3 = {
  visible: "visible",
  active: "active",
  zoom: "zoom"
};
function Lightbox(node) {
  var trap = createFocusTrap(node);
  var navItems = t$6(selectors$6.navItem, node);
  var wrapper = n$3(selectors$6.wrapper, node);
  var images = t$6(selectors$6.slide, node);
  var previousButton = n$3(selectors$6.prevButton, node);
  var nextButton = n$3(selectors$6.nextButton, node);
  var sliderContainer = n$3(selectors$6.slider, node);
  var slider = null;
  import(flu.chunks.flickity).then(_ref => {
    var {
      Flickity
    } = _ref;
    slider = new Flickity(sliderContainer, {
      adaptiveHeight: true,
      draggable: isMobile$1({
        tablet: true,
        featureDetect: true
      }),
      prevNextButtons: false,
      wrapAround: false,
      pageDots: false
    });
  });

  if (images.length > 1) {
    var _slider, _slider2;

    (_slider = slider) === null || _slider === void 0 ? void 0 : _slider.on("scroll", progress => {
      _resetZoom();

      var progressScale = progress * 100; // https://github.com/metafizzy/flickity/issues/289

      previousButton.disabled = progressScale < 1;
      nextButton.disabled = progressScale > 99;
    });
    (_slider2 = slider) === null || _slider2 === void 0 ? void 0 : _slider2.on("select", () => {
      var _slider3, _slider4;

      navItems.forEach(item => i$1(item, classes$3.active));
      u$2(navItems[(_slider3 = slider) === null || _slider3 === void 0 ? void 0 : _slider3.selectedIndex], classes$3.active);
      navItems[(_slider4 = slider) === null || _slider4 === void 0 ? void 0 : _slider4.selectedIndex].scrollIntoView({
        behavior: "smooth",
        inline: "nearest"
      });
    });
  } else {
    u$2(previousButton, "hidden");
    u$2(nextButton, "hidden");
    previousButton.disabled = true;
    nextButton.disabled = true;
  }

  var events = [e$3(n$3(selectors$6.close, node), "click", e => {
    e.preventDefault();
    close();
  }), e$3(node, "keydown", _ref2 => {
    var {
      keyCode
    } = _ref2;
    if (keyCode === 27) close();
  }), e$3(navItems, "click", e => {
    var _slider5;

    e.preventDefault();
    var {
      index
    } = e.currentTarget.dataset;
    (_slider5 = slider) === null || _slider5 === void 0 ? void 0 : _slider5.select(index);
  }), e$3(images, "click", e => {
    e.preventDefault();

    _handleZoom(e);
  }), e$3(previousButton, "click", () => {
    var _slider6;

    return (_slider6 = slider) === null || _slider6 === void 0 ? void 0 : _slider6.previous();
  }), e$3(nextButton, "click", () => {
    var _slider7;

    return (_slider7 = slider) === null || _slider7 === void 0 ? void 0 : _slider7.next();
  })];

  function _handleZoom(event) {
    var image = event.currentTarget;
    var zoomed = image.classList.contains(classes$3.zoom);
    l(image, classes$3.zoom, !zoomed);

    if (zoomed) {
      _resetZoom(image);

      return;
    }

    var x = event.clientX;
    var y = event.clientY + wrapper.scrollTop - sliderContainer.offsetTop;
    var xDelta = (x - image.clientWidth / 2) * -1;
    var yDelta = (y - image.clientHeight / 2) * -1;
    image.style.transform = "translate3d(".concat(xDelta, "px, ").concat(yDelta, "px, 0) scale(2)");
  }

  function _resetZoom(image) {
    if (image) {
      i$1(image, classes$3.zoom);
      image.style.transform = "translate3d(0px, 0px, 0) scale(1)";
      return;
    }

    images.forEach(image => {
      i$1(image, classes$3.zoom);
      image.style.transform = "translate3d(0px, 0px, 0) scale(1)";
    });
  }

  function open(id) {
    u$2(node, classes$3.active);
    setTimeout(() => {
      var _slider8;

      u$2(node, classes$3.visible);
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }

            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      trap.activate();
      var image = n$3(selectors$6.imageById(id), node);
      var {
        slideIndex
      } = image.dataset;
      (_slider8 = slider) === null || _slider8 === void 0 ? void 0 : _slider8.select(slideIndex, false, true);
    }, 50);
  }

  function close() {
    _resetZoom();

    i$1(node, classes$3.visible);
    setTimeout(() => {
      i$1(node, classes$3.active);
      enableBodyScroll(node);
      trap.deactivate();
    }, 300);
  }

  function destroy() {
    var _slider9;

    events.forEach(unsubscribe => unsubscribe());
    (_slider9 = slider) === null || _slider9 === void 0 ? void 0 : _slider9.destroy();
  }

  return {
    destroy,
    open
  };
}

var heightObserver = callback => {
  var observables = []; // Array of observed elements that looks like const :
  // [{
  //   el: domNode,
  //   size: {height: x}
  // }]

  var observe = el => {
    if (observables.some(observable => observable.el === el)) {
      return;
    }

    var newObservable = {
      el: el,
      size: {
        height: el.clientHeight
      }
    };
    observables.push(newObservable);
  };

  var unobserve = el => {
    observables = observables.filter(obj => obj.el !== el);
  };

  var check = () => {
    var changedEntries = observables.filter(obj => {
      var currentHeight = obj.el.clientHeight;

      if (obj.size.height !== currentHeight) {
        obj.size.height = currentHeight;
        return true;
      }
    }).map(obj => obj.el);

    if (changedEntries.length > 0) {
      callback(changedEntries);
    }

    window.requestAnimationFrame(check);
  };

  check();

  var unload = () => {
    observables = [];
  };

  return {
    unload,
    observe,
    unobserve
  };
};

var selectors$5 = {
  sectionWrapper: ".product-page-wrapper",
  imagesContainer: ".product__media",
  images: ".media__image",
  swatches: "[data-product-swatches]",
  chips: "[data-product-chips]",
  quantityInput: ".product-form__quantity",
  socialSharing: ".share",
  productDetailsWrapper: ".product__meta-inner",
  productDescription: ".product__description",
  accordion: ".accordion",
  productForm: "[data-product-form]",
  lightboxTrigger: ".product__media-action-button",
  thumb: "[data-product-thumbnail]",
  inYourSpace: "[data-in-your-space]"
};
var carouselOpts = {
  adaptiveHeight: false,
  arrowShape: "M27.64 51.03 42.52 35.13 45.43 37.89 34.83 49.09 71.63 49.09 71.63 53.09 34.83 53.09 45.25 64.12 42.52 67.05 27.64 51.03z",
  pageDots: false,
  watchCSS: true,
  initialIndex: ".is-initial-select"
}; // LERP returns a number between start and end based on the amt
// Often used to smooth animations
// Eg. Given: start = 0, end = 100
// - if amt = 0.1 then lerp will return 10
// - if amt = 0.5 then lerp will return 50
// - if amt = 0.9 then lerp will return 90

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

register("product", {
  onLoad() {
    this.container.classList.add("product--loaded");
    this.media = Media(n$3(".product__media-container", this.container));
    var productFormContainer = this.container.querySelector(selectors$5.productForm);
    var inYourSpaceButton = this.container.querySelector(".product__view-in-space");

    if (isMobile$1() && Boolean(inYourSpaceButton)) {
      inYourSpaceButton.classList.add("visible");
    }

    this.productForm = productForm(productFormContainer, {
      isProductPage: true,
      container: this.container
    });
    this.optionButtons = OptionButtons(t$6("[data-option-buttons]", this.container));
    this.quantityInput = quantityInput.call(this, selectors$5.quantityInput);
    this.sectionWrapper = document.querySelector(selectors$5.sectionWrapper);
    this.productDetails = this.container.querySelector(selectors$5.productDetailsWrapper);
    this.variantPopup = variantPopup(this.container);
    this.complementaryProducts = complementaryProducts(this.container);
    this.animateProduct = animateProduct(this.container); // Here we check if the merchant added a product reviews section or not

    var reviewsContainer = document.querySelector("#shopify-product-reviews");
    var reviewsTemplate = this.container.querySelector(".product-reviews-template");
    var reviewsDrawer = this.container.querySelector("[data-reviews-drawer]");
    var reviewsIsDrawer = false;

    if (!reviewsContainer && reviewsTemplate && reviewsDrawer) {
      reviewsDrawer.classList.add("reviews-flyout--active");
      reviewsDrawer.appendChild(reviewsTemplate.content.cloneNode(true));
      reviewsIsDrawer = true;
    }

    window.SPRCallbacks = {};

    window.SPRCallbacks.onReviewsLoad = () => {
      if (!this.reviews) {
        this.reviews = reviews(this.container, reviewsIsDrawer);
      }
    };

    this.accordions = this.container.querySelectorAll(selectors$5.accordion);
    this.accordions.forEach(item => {
      if (!item.classList.contains("accordion--active")) {
        accordion(item);
      }
    });
    this.socialButtons = t$6("[data-social-share]", this.container);
    this.socialButtonsClick = e$3(this.socialButtons, "click", e => {
      l(e.target, "active");
      var sub = n$3(".product__share-icons", e.target);
      sub.setAttribute("aria-hidden", !e.target.classList.contains("active"));
    });

    this._initLightbox();

    this._initThumbnails();

    this._initSlider();

    this._wrapTables();

    this.mediaUpateListener = c$1("product:mediaSelect", _ref => {
      var {
        selectedMedia
      } = _ref;
      return this.carousel.select(selectedMedia);
    });
    document.body.classList.remove("product--full-width");

    if (this.container.classList.contains("product--full-width")) {
      document.body.classList.add("product--full-width");
    }

    var featureWidgetVideo = n$3(".product-feature-widget--video", this.container);

    if (featureWidgetVideo) {
      this.videoHandler = backgroundVideoHandler(this.container);
    }

    this.container.style.setProperty("--product-details-top", 0);

    if (!isMobile$1()) {
      this._initDetailsScroll();
    } // Handle dynamic variant options


    this.variantAvailability = variantAvailability(this.container);
  },

  _initDetailsScroll() {
    // The previous scroll position of the page
    this.previousScrollY = window.scrollY; // To keep track of the amount scrolled per event

    this.currentScrollAmount = 0; // Height of the header bar, used for calculating position

    this.headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height").replace(/px/gi, "")); // The value to set the product details `top` value to

    this.detailsTop = this.headerHeight;
    this.detailsTopPrevious = this.detailsTop; // The height of the product details container
    // Gets updated by a resize observer on the window and the details container

    this.detailsHeight = this.productDetails.offsetHeight; // The height of the product details container plus the height of the header

    this.detailsHeightWithHeader = this.detailsHeight + this.headerHeight; // The max amount to set the details `top` value
    // This is equal to the number of pixels that the details container is hidden by the viewport
    // Gets updated by a resize observer on the window and the details container

    this.detailsMaxTop = this.detailsHeightWithHeader - window.innerHeight;
    this.container.style.setProperty("--product-details-top", "".concat(this.detailsTop, "px")); // Whatch scroll updates

    this.scroller = srraf(_ref2 => {
      var {
        y
      } = _ref2;

      this._scrollHandler(y);
    }); // Resize observer on the window and the product details
    // Things like accordions can change the height of the details container

    this.resizeObserver = heightObserver(() => {
      this.detailsHeight = this.productDetails.offsetHeight;
      this.headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height").replace(/px/gi, ""));
      this.detailsHeightWithHeader = this.detailsHeight + this.headerHeight;
      this.detailsMaxTop = this.detailsHeightWithHeader - window.innerHeight; // Check if the product details container is taller than the viewport
      // and section container has room for the details to scroll.
      // If thumbnails are shown then the details are probably the tallest
      // element in the section and won't have room to scroll.

      if (this.detailsHeightWithHeader > window.innerHeight && this.container.offsetHeight > this.detailsHeightWithHeader) {
        u$2(this.container, "product--has-sticky-scroll");

        this._scrollHandler(window.scrollY);
      } else {
        i$1(this.container, "product--has-sticky-scroll");
      }
    });
    this.resizeObserver.observe(this.productDetails);
    this.resizeObserver.observe(document.documentElement); // Start the animation loop

    requestAnimationFrame(() => this.updateDetailsTopLoop());
  },

  // This is an endless RAF loop used to update the top position CSS var
  // We're using this with a LERP function to smooth out the position updating
  // instead of having large jumps while scrolling fast
  updateDetailsTopLoop() {
    // We want to continue to update the top var until fully into the stopped position
    if (this.detailsTop !== this.detailsTopPrevious) {
      this.detailsTopPrevious = lerp(this.detailsTopPrevious, this.detailsTop, 0.5);
      this.container.style.setProperty("--product-details-top", "".concat(this.detailsTopPrevious, "px"));
    }

    requestAnimationFrame(() => this.updateDetailsTopLoop());
  },

  _scrollHandler(y) {
    // this.detailsTopPrevious = this.detailsTop;
    this.currentScrollAmount = this.previousScrollY - y; // The offset based on how far the page has been scrolled from last event

    var currentScrollOffset = this.detailsTop + this.currentScrollAmount; // The max top value while scrolling up

    var topMax = this.headerHeight; // The max top value while scrolling down

    var bottomMax = -this.detailsMaxTop + this.headerHeight - 40; // Calculate the current top value based on the currentScrollOffset value in the range of topMax and bottomMax

    this.detailsTop = Math.max(bottomMax, Math.min(currentScrollOffset, topMax)); // Update the previous scroll position for next time

    this.previousScrollY = y;
  },

  _initThumbnails() {
    this.productThumbs = this.container.querySelectorAll(selectors$5.thumb);
    this.productThumbs.forEach(thumb => {
      thumb.addEventListener("click", this._handleThumbClick.bind(this));
    });
  },

  _handleThumbClick(e) {
    e.preventDefault();
    var {
      currentTarget: {
        dataset
      }
    } = e;
    this.productThumbs.forEach(thumb => thumb.classList.remove("active"));
    e.currentTarget.classList.add("active");
    switchImage(this.container, dataset.thumbnailId);
  },

  _initLightbox() {
    this.images = this.container.querySelectorAll(selectors$5.images);
    this.lightboxTrigger = this.container.querySelector(selectors$5.lightboxTrigger);
    var lightbox = this.container.querySelector("[data-lightbox]");
    this.lightbox = Lightbox(lightbox);
    this.images.forEach(image => {
      image.addEventListener("click", this._handleImageClick.bind(this));
    });
    this.lightboxTrigger && this.lightboxTrigger.addEventListener("click", this.lightbox.open);
  },

  _handleImageClick(e) {
    e.preventDefault();
    this.lightbox.open(e.currentTarget.dataset.open);
    this.media && this.media.pauseActiveMedia();
  },

  _initSlider() {
    import(flu.chunks.flickity).then(_ref3 => {
      var {
        Flickity
      } = _ref3;
      var imagesContainer = this.container.querySelector(selectors$5.imagesContainer);
      var images = imagesContainer.querySelectorAll(".media-wrapper");
      carouselOpts.wrapAround = images.length > 2;
      this.carousel = new Flickity(imagesContainer, _objectSpread2(_objectSpread2({}, carouselOpts), {}, {
        on: {
          ready: function ready() {
            if (this.selectedElement.querySelector('[data-media-type="model"]')) {
              this.unbindDrag();
            }
          },
          change: () => {
            // Disable dragging so user can interact with model
            if (this.carousel.selectedElement.querySelector('[data-media-type="model"]')) {
              this.carousel.unbindDrag();
              var newImageMedia = n$3(".media", this.carousel.selectedElement);
              var inYourSpaceButton = n$3(selectors$5.inYourSpace, this.container);

              if (inYourSpaceButton) {
                if (newImageMedia.dataset.mediaType === "model") {
                  inYourSpaceButton.setAttribute("data-shopify-model3d-id", newImageMedia.dataset.mediaId);
                }
              }
            } else {
              this.carousel.bindDrag();
            }
          }
        }
      }));
    });
  },

  _wrapTables() {
    var tables = this.container.querySelectorAll("table");
    tables.forEach(el => {
      var wrapper = document.createElement("div");
      wrapper.classList.add("rte-table");
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    });
  },

  onUnload() {
    var _this$resizeObserver, _this$scroller, _this$variantAvailabi, _this$complementaryPr, _this$animateProduct;

    this.lightbox.destroy();
    this.reviews && this.reviews.unload();
    this.quantityInput && this.quantityInput();
    this.productForm.unload();
    this.carousel.destroy();
    this.mediaUpateListener();
    this.variantPopup.unload();
    this.optionButtons.destroy();
    this.socialButtonsClick();
    (_this$resizeObserver = this.resizeObserver) === null || _this$resizeObserver === void 0 ? void 0 : _this$resizeObserver.unload();
    (_this$scroller = this.scroller) === null || _this$scroller === void 0 ? void 0 : _this$scroller.scroller.destroy();
    (_this$variantAvailabi = this.variantAvailability) === null || _this$variantAvailabi === void 0 ? void 0 : _this$variantAvailabi.unload();
    (_this$complementaryPr = this.complementaryProducts) === null || _this$complementaryPr === void 0 ? void 0 : _this$complementaryPr.unload();
    (_this$animateProduct = this.animateProduct) === null || _this$animateProduct === void 0 ? void 0 : _this$animateProduct.destroy();
    this.images.forEach(image => {
      image.removeEventListener("click", this._handleImageClick);
    });
    this.lightboxTrigger && this.lightboxTrigger.removeEventListener("click", this.lightbox.open);
  }

});

var url_min = {exports: {}};

(function (module) {
!function(t){var y=/^[a-z]+:/,d=/[-a-z0-9]+(\.[-a-z0-9])*:\d+/i,v=/\/\/(.*?)(?::(.*?))?@/,r=/^win/i,g=/:$/,m=/^\?/,q=/^#/,w=/(.*\/)/,A=/^\/{2,}/,I=/(^\/?)/,e=/'/g,o=/%([ef][0-9a-f])%([89ab][0-9a-f])%([89ab][0-9a-f])/gi,n=/%([cd][0-9a-f])%([89ab][0-9a-f])/gi,i=/%([0-7][0-9a-f])/gi,s=/\+/g,a=/^\w:$/,C=/[^/#?]/;var p,S="undefined"==typeof window&&"undefined"!=typeof commonjsGlobal&&"function"==typeof commonjsRequire,b=!S&&t.navigator&&t.navigator.userAgent&&~t.navigator.userAgent.indexOf("MSIE"),x=S?t.require:null,j={protocol:"protocol",host:"hostname",port:"port",path:"pathname",query:"search",hash:"hash"},z={ftp:21,gopher:70,http:80,https:443,ws:80,wss:443};function E(){return S?p=p||"file://"+(process.platform.match(r)?"/":"")+x("fs").realpathSync("."):"about:srcdoc"===document.location.href?self.parent.document.location.href:document.location.href}function h(t,r,e){var o,n,i;r=r||E(),S?o=x("url").parse(r):(o=document.createElement("a")).href=r;var a,s,p=(s={path:!0,query:!0,hash:!0},(a=r)&&y.test(a)&&(s.protocol=!0,s.host=!0,d.test(a)&&(s.port=!0),v.test(a)&&(s.user=!0,s.pass=!0)),s);for(n in i=r.match(v)||[],j)p[n]?t[n]=o[j[n]]||"":t[n]="";if(t.protocol=t.protocol.replace(g,""),t.query=t.query.replace(m,""),t.hash=F(t.hash.replace(q,"")),t.user=F(i[1]||""),t.pass=F(i[2]||""),t.port=z[t.protocol]==t.port||0==t.port?"":t.port,!p.protocol&&C.test(r.charAt(0))&&(t.path=r.split("?")[0].split("#")[0]),!p.protocol&&e){var h=new L(E().match(w)[0]),u=h.path.split("/"),c=t.path.split("/"),f=["protocol","user","pass","host","port"],l=f.length;for(u.pop(),n=0;n<l;n++)t[f[n]]=h[f[n]];for(;".."===c[0];)u.pop(),c.shift();t.path=("/"!==r.charAt(0)?u.join("/"):"")+"/"+c.join("/");}t.path=t.path.replace(A,"/"),b&&(t.path=t.path.replace(I,"/")),t.paths(t.paths()),t.query=new U(t.query);}function u(t){return encodeURIComponent(t).replace(e,"%27")}function F(t){return (t=(t=(t=t.replace(s," ")).replace(o,function(t,r,e,o){var n=parseInt(r,16)-224,i=parseInt(e,16)-128;if(0==n&&i<32)return t;var a=(n<<12)+(i<<6)+(parseInt(o,16)-128);return 65535<a?t:String.fromCharCode(a)})).replace(n,function(t,r,e){var o=parseInt(r,16)-192;if(o<2)return t;var n=parseInt(e,16)-128;return String.fromCharCode((o<<6)+n)})).replace(i,function(t,r){return String.fromCharCode(parseInt(r,16))})}function U(t){for(var r=t.split("&"),e=0,o=r.length;e<o;e++){var n=r[e].split("="),i=decodeURIComponent(n[0].replace(s," "));if(i){var a=void 0!==n[1]?F(n[1]):null;void 0===this[i]?this[i]=a:(this[i]instanceof Array||(this[i]=[this[i]]),this[i].push(a));}}}function L(t,r){h(this,t,!r);}U.prototype.toString=function(){var t,r,e="",o=u;for(t in this){var n=this[t];if(!(n instanceof Function||void 0===n))if(n instanceof Array){var i=n.length;if(!i){e+=(e?"&":"")+o(t)+"=";continue}for(r=0;r<i;r++){var a=n[r];void 0!==a&&(e+=e?"&":"",e+=o(t)+(null===a?"":"="+o(a)));}}else e+=e?"&":"",e+=o(t)+(null===n?"":"="+o(n));}return e},L.prototype.clearQuery=function(){for(var t in this.query)this.query[t]instanceof Function||delete this.query[t];return this},L.prototype.queryLength=function(){var t=0;for(var r in this.query)this.query[r]instanceof Function||t++;return t},L.prototype.isEmptyQuery=function(){return 0===this.queryLength()},L.prototype.paths=function(t){var r,e="",o=0;if(t&&t.length&&t+""!==t){for(this.isAbsolute()&&(e="/"),r=t.length;o<r;o++)t[o]=!o&&a.test(t[o])?t[o]:u(t[o]);this.path=e+t.join("/");}for(o=0,r=(t=("/"===this.path.charAt(0)?this.path.slice(1):this.path).split("/")).length;o<r;o++)t[o]=F(t[o]);return t},L.prototype.encode=u,L.prototype.decode=F,L.prototype.isAbsolute=function(){return this.protocol||"/"===this.path.charAt(0)},L.prototype.toString=function(){return (this.protocol&&this.protocol+"://")+(this.user&&u(this.user)+(this.pass&&":"+u(this.pass))+"@")+(this.host&&this.host)+(this.port&&":"+this.port)+(this.path&&this.path)+(this.query.toString()&&"?"+this.query)+(this.hash&&"#"+u(this.hash))},t[t.exports?"exports":"Url"]=L;}(module.exports?module:window);
}(url_min));

var t$1 = url_min.exports;

function Collection(e){var r=new t$1(e||window.location.href),n=r.paths().indexOf("collections")>0?3:2;function o(t){var e=r.paths().slice(0,n);r.paths([].concat(e,[t]));}function u(){var t=r.paths().filter(Boolean);return t[n]?t[n].split(" "):[]}return {getState:function(){return {handle:r.paths()[1],page:Number(r.query.page)||1,sort_by:r.query.sort_by||null,tags:u(),url:r.toString().replace(/%20/g,"+")}},addTags:function(t,e){return o([].concat(u(),t).filter(function(t,e,r){return r.indexOf(t)==e}).join(" ")),delete r.query.page,e(this.getState())},removeTags:function(t,e){return o(u().filter(function(e){return !t.includes(e)}).join(" ")),delete r.query.page,e(this.getState())},setSort:function(t,e){return r.query.sort_by=t,e(this.getState())},clearSort:function(t){return delete r.query.sort_by,t(this.getState())},clearAll:function(t){return delete r.query.sort_by,o(""),t(this.getState())}}}

/* @preserve
 * https://github.com/Elkfox/Ajaxinate
 * Copyright (c) 2017 Elkfox Co Pty Ltd (elkfox.com)
 * MIT License (do not remove above copyright!)
 */

/* Configurable options;
 *
 * method: scroll or click
 * container: selector of repeating content
 * pagination: selector of pagination container
 * offset: number of pixels before the bottom to start loading more on scroll
 * loadingText: 'Loading', The text shown during when appending new content
 * callback: null, callback function after new content is appended
 *
 * Usage;
 *
 * import {Ajaxinate} from 'ajaxinate';
 *
 * new Ajaxinate({
 *   offset: 5000,
 *   loadingText: 'Loading more...',
 * });
 */

/* eslint-env browser */
function Ajaxinate(config) {
  const settings = config || {};

  const defaults = {
    method: 'scroll',
    container: '#AjaxinateContainer',
    pagination: '#AjaxinatePagination',
    offset: 0,
    loadingText: 'Loading',
    callback: null,
  };

  // Merge custom configs with defaults
  this.settings = Object.assign(defaults, settings);

  // Functions
  this.addScrollListeners = this.addScrollListeners.bind(this);
  this.addClickListener = this.addClickListener.bind(this);
  this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this);
  this.preventMultipleClicks = this.preventMultipleClicks.bind(this);
  this.removeClickListener = this.removeClickListener.bind(this);
  this.removeScrollListener = this.removeScrollListener.bind(this);
  this.removePaginationElement = this.removePaginationElement.bind(this);
  this.destroy = this.destroy.bind(this);

  // Selectors
  this.containerElement = document.querySelector(this.settings.container);
  this.paginationElement = document.querySelector(this.settings.pagination);
  this.initialize();
}

Ajaxinate.prototype.initialize = function initialize() {
  if (!this.containerElement) { return; }

  const initializers = {
    click: this.addClickListener,
    scroll: this.addScrollListeners,
  };

  initializers[this.settings.method]();
};

Ajaxinate.prototype.addScrollListeners = function addScrollListeners() {
  if (!this.paginationElement) { return; }

  document.addEventListener('scroll', this.checkIfPaginationInView);
  window.addEventListener('resize', this.checkIfPaginationInView);
  window.addEventListener('orientationchange', this.checkIfPaginationInView);
};

Ajaxinate.prototype.addClickListener = function addClickListener() {
  if (!this.paginationElement) { return; }

  this.nextPageLinkElement = this.paginationElement.querySelector('a');
  this.clickActive = true;

  if (typeof this.nextPageLinkElement !== 'undefined' && this.nextPageLinkElement !== null) {
    this.nextPageLinkElement.addEventListener('click', this.preventMultipleClicks);
  }
};

Ajaxinate.prototype.preventMultipleClicks = function preventMultipleClicks(event) {
  event.preventDefault();

  if (!this.clickActive) { return; }

  this.nextPageLinkElement.innerText = this.settings.loadingText;
  this.nextPageUrl = this.nextPageLinkElement.href;
  this.clickActive = false;

  this.loadMore();
};

Ajaxinate.prototype.checkIfPaginationInView = function checkIfPaginationInView() {
  const top = this.paginationElement.getBoundingClientRect().top - this.settings.offset;
  const bottom = this.paginationElement.getBoundingClientRect().bottom + this.settings.offset;

  if (top <= window.innerHeight && bottom >= 0) {
    this.nextPageLinkElement = this.paginationElement.querySelector('a');
    this.removeScrollListener();

    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.innerText = this.settings.loadingText;
      this.nextPageUrl = this.nextPageLinkElement.href;

      this.loadMore();
    }
  }
};

Ajaxinate.prototype.loadMore = function loadMore() {
  this.request = new XMLHttpRequest();

  this.request.onreadystatechange = function success() {
    if (!this.request.responseXML) { return; }
    if (!this.request.readyState === 4 || !this.request.status === 200) { return; }

    const newContainer = this.request.responseXML.querySelectorAll(this.settings.container)[0];
    const newPagination = this.request.responseXML.querySelectorAll(this.settings.pagination)[0];

    this.containerElement.insertAdjacentHTML('beforeend', newContainer.innerHTML);

    if (typeof newPagination === 'undefined') {
      this.removePaginationElement();
    } else {
      this.paginationElement.innerHTML = newPagination.innerHTML;

      if (this.settings.callback && typeof this.settings.callback === 'function') {
        this.settings.callback(this.request.responseXML);
      }

      this.initialize();
    }
  }.bind(this);

  this.request.open('GET', this.nextPageUrl);
  this.request.responseType = 'document';
  this.request.send();
};

Ajaxinate.prototype.removeClickListener = function removeClickListener() {
  this.nextPageLinkElement.removeEventListener('click', this.preventMultipleClicks);
};

Ajaxinate.prototype.removePaginationElement = function removePaginationElement() {
  this.paginationElement.innerHTML = '';
  this.destroy();
};

Ajaxinate.prototype.removeScrollListener = function removeScrollListener() {
  document.removeEventListener('scroll', this.checkIfPaginationInView);
  window.removeEventListener('resize', this.checkIfPaginationInView);
  window.removeEventListener('orientationchange', this.checkIfPaginationInView);
};

Ajaxinate.prototype.destroy = function destroy() {
  const destroyers = {
    click: this.removeClickListener,
    scroll: this.removeScrollListener,
  };

  destroyers[this.settings.method]();

  return this;
};

// Ajaxinate custmoizer fix https://github.com/Elkfox/Ajaxinate/issues/26
var AjaxinateShim = lib => {
  lib.prototype.loadMore = function getTheHtmlOfTheNextPageWithAnAjaxRequest() {
    this.request = new XMLHttpRequest();

    this.request.onreadystatechange = function success() {
      if (this.request.readyState === 4 && this.request.status === 200) {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(this.request.responseText, "text/html");
        var newContainer = htmlDoc.querySelectorAll(this.settings.container)[0];
        var newPagination = htmlDoc.querySelectorAll(this.settings.pagination)[0];
        this.containerElement.insertAdjacentHTML("beforeend", newContainer.innerHTML);
        this.paginationElement.innerHTML = newPagination.innerHTML;

        if (this.settings.callback && typeof this.settings.callback === "function") {
          this.settings.callback(this.request.responseXML);
        }

        this.initialize();
      }
    }.bind(this);

    this.request.open("GET", this.nextPageUrl, false);
    this.request.send();
  };
};

function t(){try{return localStorage.setItem("test","test"),localStorage.removeItem("test"),!0}catch(t){return !1}}function e(e){if(t())return JSON.parse(localStorage.getItem("neon_"+e))}function r(e,r){if(t())return localStorage.setItem("neon_"+e,r)}

var nouislider = {exports: {}};

(function (module, exports) {
(function (global, factory) {
    factory(exports) ;
})(commonjsGlobal, (function (exports) {
    exports.PipsMode = void 0;
    (function (PipsMode) {
        PipsMode["Range"] = "range";
        PipsMode["Steps"] = "steps";
        PipsMode["Positions"] = "positions";
        PipsMode["Count"] = "count";
        PipsMode["Values"] = "values";
    })(exports.PipsMode || (exports.PipsMode = {}));
    exports.PipsType = void 0;
    (function (PipsType) {
        PipsType[PipsType["None"] = -1] = "None";
        PipsType[PipsType["NoValue"] = 0] = "NoValue";
        PipsType[PipsType["LargeValue"] = 1] = "LargeValue";
        PipsType[PipsType["SmallValue"] = 2] = "SmallValue";
    })(exports.PipsType || (exports.PipsType = {}));
    //region Helper Methods
    function isValidFormatter(entry) {
        return isValidPartialFormatter(entry) && typeof entry.from === "function";
    }
    function isValidPartialFormatter(entry) {
        // partial formatters only need a to function and not a from function
        return typeof entry === "object" && typeof entry.to === "function";
    }
    function removeElement(el) {
        el.parentElement.removeChild(el);
    }
    function isSet(value) {
        return value !== null && value !== undefined;
    }
    // Bindable version
    function preventDefault(e) {
        e.preventDefault();
    }
    // Removes duplicates from an array.
    function unique(array) {
        return array.filter(function (a) {
            return !this[a] ? (this[a] = true) : false;
        }, {});
    }
    // Round a value to the closest 'to'.
    function closest(value, to) {
        return Math.round(value / to) * to;
    }
    // Current position of an element relative to the document.
    function offset(elem, orientation) {
        var rect = elem.getBoundingClientRect();
        var doc = elem.ownerDocument;
        var docElem = doc.documentElement;
        var pageOffset = getPageOffset(doc);
        // getBoundingClientRect contains left scroll in Chrome on Android.
        // I haven't found a feature detection that proves this. Worst case
        // scenario on mis-match: the 'tap' feature on horizontal sliders breaks.
        if (/webkit.*Chrome.*Mobile/i.test(navigator.userAgent)) {
            pageOffset.x = 0;
        }
        return orientation ? rect.top + pageOffset.y - docElem.clientTop : rect.left + pageOffset.x - docElem.clientLeft;
    }
    // Checks whether a value is numerical.
    function isNumeric(a) {
        return typeof a === "number" && !isNaN(a) && isFinite(a);
    }
    // Sets a class and removes it after [duration] ms.
    function addClassFor(element, className, duration) {
        if (duration > 0) {
            addClass(element, className);
            setTimeout(function () {
                removeClass(element, className);
            }, duration);
        }
    }
    // Limits a value to 0 - 100
    function limit(a) {
        return Math.max(Math.min(a, 100), 0);
    }
    // Wraps a variable as an array, if it isn't one yet.
    // Note that an input array is returned by reference!
    function asArray(a) {
        return Array.isArray(a) ? a : [a];
    }
    // Counts decimals
    function countDecimals(numStr) {
        numStr = String(numStr);
        var pieces = numStr.split(".");
        return pieces.length > 1 ? pieces[1].length : 0;
    }
    // http://youmightnotneedjquery.com/#add_class
    function addClass(el, className) {
        if (el.classList && !/\s/.test(className)) {
            el.classList.add(className);
        }
        else {
            el.className += " " + className;
        }
    }
    // http://youmightnotneedjquery.com/#remove_class
    function removeClass(el, className) {
        if (el.classList && !/\s/.test(className)) {
            el.classList.remove(className);
        }
        else {
            el.className = el.className.replace(new RegExp("(^|\\b)" + className.split(" ").join("|") + "(\\b|$)", "gi"), " ");
        }
    }
    // https://plainjs.com/javascript/attributes/adding-removing-and-testing-for-classes-9/
    function hasClass(el, className) {
        return el.classList ? el.classList.contains(className) : new RegExp("\\b" + className + "\\b").test(el.className);
    }
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollY#Notes
    function getPageOffset(doc) {
        var supportPageOffset = window.pageXOffset !== undefined;
        var isCSS1Compat = (doc.compatMode || "") === "CSS1Compat";
        var x = supportPageOffset
            ? window.pageXOffset
            : isCSS1Compat
                ? doc.documentElement.scrollLeft
                : doc.body.scrollLeft;
        var y = supportPageOffset
            ? window.pageYOffset
            : isCSS1Compat
                ? doc.documentElement.scrollTop
                : doc.body.scrollTop;
        return {
            x: x,
            y: y,
        };
    }
    // we provide a function to compute constants instead
    // of accessing window.* as soon as the module needs it
    // so that we do not compute anything if not needed
    function getActions() {
        // Determine the events to bind. IE11 implements pointerEvents without
        // a prefix, which breaks compatibility with the IE10 implementation.
        return window.navigator.pointerEnabled
            ? {
                start: "pointerdown",
                move: "pointermove",
                end: "pointerup",
            }
            : window.navigator.msPointerEnabled
                ? {
                    start: "MSPointerDown",
                    move: "MSPointerMove",
                    end: "MSPointerUp",
                }
                : {
                    start: "mousedown touchstart",
                    move: "mousemove touchmove",
                    end: "mouseup touchend",
                };
    }
    // https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
    // Issue #785
    function getSupportsPassive() {
        var supportsPassive = false;
        /* eslint-disable */
        try {
            var opts = Object.defineProperty({}, "passive", {
                get: function () {
                    supportsPassive = true;
                },
            });
            // @ts-ignore
            window.addEventListener("test", null, opts);
        }
        catch (e) { }
        /* eslint-enable */
        return supportsPassive;
    }
    function getSupportsTouchActionNone() {
        return window.CSS && CSS.supports && CSS.supports("touch-action", "none");
    }
    //endregion
    //region Range Calculation
    // Determine the size of a sub-range in relation to a full range.
    function subRangeRatio(pa, pb) {
        return 100 / (pb - pa);
    }
    // (percentage) How many percent is this value of this range?
    function fromPercentage(range, value, startRange) {
        return (value * 100) / (range[startRange + 1] - range[startRange]);
    }
    // (percentage) Where is this value on this range?
    function toPercentage(range, value) {
        return fromPercentage(range, range[0] < 0 ? value + Math.abs(range[0]) : value - range[0], 0);
    }
    // (value) How much is this percentage on this range?
    function isPercentage(range, value) {
        return (value * (range[1] - range[0])) / 100 + range[0];
    }
    function getJ(value, arr) {
        var j = 1;
        while (value >= arr[j]) {
            j += 1;
        }
        return j;
    }
    // (percentage) Input a value, find where, on a scale of 0-100, it applies.
    function toStepping(xVal, xPct, value) {
        if (value >= xVal.slice(-1)[0]) {
            return 100;
        }
        var j = getJ(value, xVal);
        var va = xVal[j - 1];
        var vb = xVal[j];
        var pa = xPct[j - 1];
        var pb = xPct[j];
        return pa + toPercentage([va, vb], value) / subRangeRatio(pa, pb);
    }
    // (value) Input a percentage, find where it is on the specified range.
    function fromStepping(xVal, xPct, value) {
        // There is no range group that fits 100
        if (value >= 100) {
            return xVal.slice(-1)[0];
        }
        var j = getJ(value, xPct);
        var va = xVal[j - 1];
        var vb = xVal[j];
        var pa = xPct[j - 1];
        var pb = xPct[j];
        return isPercentage([va, vb], (value - pa) * subRangeRatio(pa, pb));
    }
    // (percentage) Get the step that applies at a certain value.
    function getStep(xPct, xSteps, snap, value) {
        if (value === 100) {
            return value;
        }
        var j = getJ(value, xPct);
        var a = xPct[j - 1];
        var b = xPct[j];
        // If 'snap' is set, steps are used as fixed points on the slider.
        if (snap) {
            // Find the closest position, a or b.
            if (value - a > (b - a) / 2) {
                return b;
            }
            return a;
        }
        if (!xSteps[j - 1]) {
            return value;
        }
        return xPct[j - 1] + closest(value - xPct[j - 1], xSteps[j - 1]);
    }
    //endregion
    //region Spectrum
    var Spectrum = /** @class */ (function () {
        function Spectrum(entry, snap, singleStep) {
            this.xPct = [];
            this.xVal = [];
            this.xSteps = [];
            this.xNumSteps = [];
            this.xHighestCompleteStep = [];
            this.xSteps = [singleStep || false];
            this.xNumSteps = [false];
            this.snap = snap;
            var index;
            var ordered = [];
            // Map the object keys to an array.
            Object.keys(entry).forEach(function (index) {
                ordered.push([asArray(entry[index]), index]);
            });
            // Sort all entries by value (numeric sort).
            ordered.sort(function (a, b) {
                return a[0][0] - b[0][0];
            });
            // Convert all entries to subranges.
            for (index = 0; index < ordered.length; index++) {
                this.handleEntryPoint(ordered[index][1], ordered[index][0]);
            }
            // Store the actual step values.
            // xSteps is sorted in the same order as xPct and xVal.
            this.xNumSteps = this.xSteps.slice(0);
            // Convert all numeric steps to the percentage of the subrange they represent.
            for (index = 0; index < this.xNumSteps.length; index++) {
                this.handleStepPoint(index, this.xNumSteps[index]);
            }
        }
        Spectrum.prototype.getDistance = function (value) {
            var distances = [];
            for (var index = 0; index < this.xNumSteps.length - 1; index++) {
                distances[index] = fromPercentage(this.xVal, value, index);
            }
            return distances;
        };
        // Calculate the percentual distance over the whole scale of ranges.
        // direction: 0 = backwards / 1 = forwards
        Spectrum.prototype.getAbsoluteDistance = function (value, distances, direction) {
            var xPct_index = 0;
            // Calculate range where to start calculation
            if (value < this.xPct[this.xPct.length - 1]) {
                while (value > this.xPct[xPct_index + 1]) {
                    xPct_index++;
                }
            }
            else if (value === this.xPct[this.xPct.length - 1]) {
                xPct_index = this.xPct.length - 2;
            }
            // If looking backwards and the value is exactly at a range separator then look one range further
            if (!direction && value === this.xPct[xPct_index + 1]) {
                xPct_index++;
            }
            if (distances === null) {
                distances = [];
            }
            var start_factor;
            var rest_factor = 1;
            var rest_rel_distance = distances[xPct_index];
            var range_pct = 0;
            var rel_range_distance = 0;
            var abs_distance_counter = 0;
            var range_counter = 0;
            // Calculate what part of the start range the value is
            if (direction) {
                start_factor = (value - this.xPct[xPct_index]) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
            }
            else {
                start_factor = (this.xPct[xPct_index + 1] - value) / (this.xPct[xPct_index + 1] - this.xPct[xPct_index]);
            }
            // Do until the complete distance across ranges is calculated
            while (rest_rel_distance > 0) {
                // Calculate the percentage of total range
                range_pct = this.xPct[xPct_index + 1 + range_counter] - this.xPct[xPct_index + range_counter];
                // Detect if the margin, padding or limit is larger then the current range and calculate
                if (distances[xPct_index + range_counter] * rest_factor + 100 - start_factor * 100 > 100) {
                    // If larger then take the percentual distance of the whole range
                    rel_range_distance = range_pct * start_factor;
                    // Rest factor of relative percentual distance still to be calculated
                    rest_factor = (rest_rel_distance - 100 * start_factor) / distances[xPct_index + range_counter];
                    // Set start factor to 1 as for next range it does not apply.
                    start_factor = 1;
                }
                else {
                    // If smaller or equal then take the percentual distance of the calculate percentual part of that range
                    rel_range_distance = ((distances[xPct_index + range_counter] * range_pct) / 100) * rest_factor;
                    // No rest left as the rest fits in current range
                    rest_factor = 0;
                }
                if (direction) {
                    abs_distance_counter = abs_distance_counter - rel_range_distance;
                    // Limit range to first range when distance becomes outside of minimum range
                    if (this.xPct.length + range_counter >= 1) {
                        range_counter--;
                    }
                }
                else {
                    abs_distance_counter = abs_distance_counter + rel_range_distance;
                    // Limit range to last range when distance becomes outside of maximum range
                    if (this.xPct.length - range_counter >= 1) {
                        range_counter++;
                    }
                }
                // Rest of relative percentual distance still to be calculated
                rest_rel_distance = distances[xPct_index + range_counter] * rest_factor;
            }
            return value + abs_distance_counter;
        };
        Spectrum.prototype.toStepping = function (value) {
            value = toStepping(this.xVal, this.xPct, value);
            return value;
        };
        Spectrum.prototype.fromStepping = function (value) {
            return fromStepping(this.xVal, this.xPct, value);
        };
        Spectrum.prototype.getStep = function (value) {
            value = getStep(this.xPct, this.xSteps, this.snap, value);
            return value;
        };
        Spectrum.prototype.getDefaultStep = function (value, isDown, size) {
            var j = getJ(value, this.xPct);
            // When at the top or stepping down, look at the previous sub-range
            if (value === 100 || (isDown && value === this.xPct[j - 1])) {
                j = Math.max(j - 1, 1);
            }
            return (this.xVal[j] - this.xVal[j - 1]) / size;
        };
        Spectrum.prototype.getNearbySteps = function (value) {
            var j = getJ(value, this.xPct);
            return {
                stepBefore: {
                    startValue: this.xVal[j - 2],
                    step: this.xNumSteps[j - 2],
                    highestStep: this.xHighestCompleteStep[j - 2],
                },
                thisStep: {
                    startValue: this.xVal[j - 1],
                    step: this.xNumSteps[j - 1],
                    highestStep: this.xHighestCompleteStep[j - 1],
                },
                stepAfter: {
                    startValue: this.xVal[j],
                    step: this.xNumSteps[j],
                    highestStep: this.xHighestCompleteStep[j],
                },
            };
        };
        Spectrum.prototype.countStepDecimals = function () {
            var stepDecimals = this.xNumSteps.map(countDecimals);
            return Math.max.apply(null, stepDecimals);
        };
        Spectrum.prototype.hasNoSize = function () {
            return this.xVal[0] === this.xVal[this.xVal.length - 1];
        };
        // Outside testing
        Spectrum.prototype.convert = function (value) {
            return this.getStep(this.toStepping(value));
        };
        Spectrum.prototype.handleEntryPoint = function (index, value) {
            var percentage;
            // Covert min/max syntax to 0 and 100.
            if (index === "min") {
                percentage = 0;
            }
            else if (index === "max") {
                percentage = 100;
            }
            else {
                percentage = parseFloat(index);
            }
            // Check for correct input.
            if (!isNumeric(percentage) || !isNumeric(value[0])) {
                throw new Error("noUiSlider: 'range' value isn't numeric.");
            }
            // Store values.
            this.xPct.push(percentage);
            this.xVal.push(value[0]);
            var value1 = Number(value[1]);
            // NaN will evaluate to false too, but to keep
            // logging clear, set step explicitly. Make sure
            // not to override the 'step' setting with false.
            if (!percentage) {
                if (!isNaN(value1)) {
                    this.xSteps[0] = value1;
                }
            }
            else {
                this.xSteps.push(isNaN(value1) ? false : value1);
            }
            this.xHighestCompleteStep.push(0);
        };
        Spectrum.prototype.handleStepPoint = function (i, n) {
            // Ignore 'false' stepping.
            if (!n) {
                return;
            }
            // Step over zero-length ranges (#948);
            if (this.xVal[i] === this.xVal[i + 1]) {
                this.xSteps[i] = this.xHighestCompleteStep[i] = this.xVal[i];
                return;
            }
            // Factor to range ratio
            this.xSteps[i] =
                fromPercentage([this.xVal[i], this.xVal[i + 1]], n, 0) / subRangeRatio(this.xPct[i], this.xPct[i + 1]);
            var totalSteps = (this.xVal[i + 1] - this.xVal[i]) / this.xNumSteps[i];
            var highestStep = Math.ceil(Number(totalSteps.toFixed(3)) - 1);
            var step = this.xVal[i] + this.xNumSteps[i] * highestStep;
            this.xHighestCompleteStep[i] = step;
        };
        return Spectrum;
    }());
    //endregion
    //region Options
    /*	Every input option is tested and parsed. This will prevent
        endless validation in internal methods. These tests are
        structured with an item for every option available. An
        option can be marked as required by setting the 'r' flag.
        The testing function is provided with three arguments:
            - The provided value for the option;
            - A reference to the options object;
            - The name for the option;

        The testing function returns false when an error is detected,
        or true when everything is OK. It can also modify the option
        object, to make sure all values can be correctly looped elsewhere. */
    //region Defaults
    var defaultFormatter = {
        to: function (value) {
            return value === undefined ? "" : value.toFixed(2);
        },
        from: Number,
    };
    var cssClasses = {
        target: "target",
        base: "base",
        origin: "origin",
        handle: "handle",
        handleLower: "handle-lower",
        handleUpper: "handle-upper",
        touchArea: "touch-area",
        horizontal: "horizontal",
        vertical: "vertical",
        background: "background",
        connect: "connect",
        connects: "connects",
        ltr: "ltr",
        rtl: "rtl",
        textDirectionLtr: "txt-dir-ltr",
        textDirectionRtl: "txt-dir-rtl",
        draggable: "draggable",
        drag: "state-drag",
        tap: "state-tap",
        active: "active",
        tooltip: "tooltip",
        pips: "pips",
        pipsHorizontal: "pips-horizontal",
        pipsVertical: "pips-vertical",
        marker: "marker",
        markerHorizontal: "marker-horizontal",
        markerVertical: "marker-vertical",
        markerNormal: "marker-normal",
        markerLarge: "marker-large",
        markerSub: "marker-sub",
        value: "value",
        valueHorizontal: "value-horizontal",
        valueVertical: "value-vertical",
        valueNormal: "value-normal",
        valueLarge: "value-large",
        valueSub: "value-sub",
    };
    // Namespaces of internal event listeners
    var INTERNAL_EVENT_NS = {
        tooltips: ".__tooltips",
        aria: ".__aria",
    };
    //endregion
    function testStep(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'step' is not numeric.");
        }
        // The step option can still be used to set stepping
        // for linear sliders. Overwritten if set in 'range'.
        parsed.singleStep = entry;
    }
    function testKeyboardPageMultiplier(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardPageMultiplier' is not numeric.");
        }
        parsed.keyboardPageMultiplier = entry;
    }
    function testKeyboardMultiplier(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardMultiplier' is not numeric.");
        }
        parsed.keyboardMultiplier = entry;
    }
    function testKeyboardDefaultStep(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'keyboardDefaultStep' is not numeric.");
        }
        parsed.keyboardDefaultStep = entry;
    }
    function testRange(parsed, entry) {
        // Filter incorrect input.
        if (typeof entry !== "object" || Array.isArray(entry)) {
            throw new Error("noUiSlider: 'range' is not an object.");
        }
        // Catch missing start or end.
        if (entry.min === undefined || entry.max === undefined) {
            throw new Error("noUiSlider: Missing 'min' or 'max' in 'range'.");
        }
        parsed.spectrum = new Spectrum(entry, parsed.snap || false, parsed.singleStep);
    }
    function testStart(parsed, entry) {
        entry = asArray(entry);
        // Validate input. Values aren't tested, as the public .val method
        // will always provide a valid location.
        if (!Array.isArray(entry) || !entry.length) {
            throw new Error("noUiSlider: 'start' option is incorrect.");
        }
        // Store the number of handles.
        parsed.handles = entry.length;
        // When the slider is initialized, the .val method will
        // be called with the start options.
        parsed.start = entry;
    }
    function testSnap(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'snap' option must be a boolean.");
        }
        // Enforce 100% stepping within subranges.
        parsed.snap = entry;
    }
    function testAnimate(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'animate' option must be a boolean.");
        }
        // Enforce 100% stepping within subranges.
        parsed.animate = entry;
    }
    function testAnimationDuration(parsed, entry) {
        if (typeof entry !== "number") {
            throw new Error("noUiSlider: 'animationDuration' option must be a number.");
        }
        parsed.animationDuration = entry;
    }
    function testConnect(parsed, entry) {
        var connect = [false];
        var i;
        // Map legacy options
        if (entry === "lower") {
            entry = [true, false];
        }
        else if (entry === "upper") {
            entry = [false, true];
        }
        // Handle boolean options
        if (entry === true || entry === false) {
            for (i = 1; i < parsed.handles; i++) {
                connect.push(entry);
            }
            connect.push(false);
        }
        // Reject invalid input
        else if (!Array.isArray(entry) || !entry.length || entry.length !== parsed.handles + 1) {
            throw new Error("noUiSlider: 'connect' option doesn't match handle count.");
        }
        else {
            connect = entry;
        }
        parsed.connect = connect;
    }
    function testOrientation(parsed, entry) {
        // Set orientation to an a numerical value for easy
        // array selection.
        switch (entry) {
            case "horizontal":
                parsed.ort = 0;
                break;
            case "vertical":
                parsed.ort = 1;
                break;
            default:
                throw new Error("noUiSlider: 'orientation' option is invalid.");
        }
    }
    function testMargin(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'margin' option must be numeric.");
        }
        // Issue #582
        if (entry === 0) {
            return;
        }
        parsed.margin = parsed.spectrum.getDistance(entry);
    }
    function testLimit(parsed, entry) {
        if (!isNumeric(entry)) {
            throw new Error("noUiSlider: 'limit' option must be numeric.");
        }
        parsed.limit = parsed.spectrum.getDistance(entry);
        if (!parsed.limit || parsed.handles < 2) {
            throw new Error("noUiSlider: 'limit' option is only supported on linear sliders with 2 or more handles.");
        }
    }
    function testPadding(parsed, entry) {
        var index;
        if (!isNumeric(entry) && !Array.isArray(entry)) {
            throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
        }
        if (Array.isArray(entry) && !(entry.length === 2 || isNumeric(entry[0]) || isNumeric(entry[1]))) {
            throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");
        }
        if (entry === 0) {
            return;
        }
        if (!Array.isArray(entry)) {
            entry = [entry, entry];
        }
        // 'getDistance' returns false for invalid values.
        parsed.padding = [parsed.spectrum.getDistance(entry[0]), parsed.spectrum.getDistance(entry[1])];
        for (index = 0; index < parsed.spectrum.xNumSteps.length - 1; index++) {
            // last "range" can't contain step size as it is purely an endpoint.
            if (parsed.padding[0][index] < 0 || parsed.padding[1][index] < 0) {
                throw new Error("noUiSlider: 'padding' option must be a positive number(s).");
            }
        }
        var totalPadding = entry[0] + entry[1];
        var firstValue = parsed.spectrum.xVal[0];
        var lastValue = parsed.spectrum.xVal[parsed.spectrum.xVal.length - 1];
        if (totalPadding / (lastValue - firstValue) > 1) {
            throw new Error("noUiSlider: 'padding' option must not exceed 100% of the range.");
        }
    }
    function testDirection(parsed, entry) {
        // Set direction as a numerical value for easy parsing.
        // Invert connection for RTL sliders, so that the proper
        // handles get the connect/background classes.
        switch (entry) {
            case "ltr":
                parsed.dir = 0;
                break;
            case "rtl":
                parsed.dir = 1;
                break;
            default:
                throw new Error("noUiSlider: 'direction' option was not recognized.");
        }
    }
    function testBehaviour(parsed, entry) {
        // Make sure the input is a string.
        if (typeof entry !== "string") {
            throw new Error("noUiSlider: 'behaviour' must be a string containing options.");
        }
        // Check if the string contains any keywords.
        // None are required.
        var tap = entry.indexOf("tap") >= 0;
        var drag = entry.indexOf("drag") >= 0;
        var fixed = entry.indexOf("fixed") >= 0;
        var snap = entry.indexOf("snap") >= 0;
        var hover = entry.indexOf("hover") >= 0;
        var unconstrained = entry.indexOf("unconstrained") >= 0;
        var dragAll = entry.indexOf("drag-all") >= 0;
        if (fixed) {
            if (parsed.handles !== 2) {
                throw new Error("noUiSlider: 'fixed' behaviour must be used with 2 handles");
            }
            // Use margin to enforce fixed state
            testMargin(parsed, parsed.start[1] - parsed.start[0]);
        }
        if (unconstrained && (parsed.margin || parsed.limit)) {
            throw new Error("noUiSlider: 'unconstrained' behaviour cannot be used with margin or limit");
        }
        parsed.events = {
            tap: tap || snap,
            drag: drag,
            dragAll: dragAll,
            fixed: fixed,
            snap: snap,
            hover: hover,
            unconstrained: unconstrained,
        };
    }
    function testTooltips(parsed, entry) {
        if (entry === false) {
            return;
        }
        if (entry === true || isValidPartialFormatter(entry)) {
            parsed.tooltips = [];
            for (var i = 0; i < parsed.handles; i++) {
                parsed.tooltips.push(entry);
            }
        }
        else {
            entry = asArray(entry);
            if (entry.length !== parsed.handles) {
                throw new Error("noUiSlider: must pass a formatter for all handles.");
            }
            entry.forEach(function (formatter) {
                if (typeof formatter !== "boolean" && !isValidPartialFormatter(formatter)) {
                    throw new Error("noUiSlider: 'tooltips' must be passed a formatter or 'false'.");
                }
            });
            parsed.tooltips = entry;
        }
    }
    function testHandleAttributes(parsed, entry) {
        if (entry.length !== parsed.handles) {
            throw new Error("noUiSlider: must pass a attributes for all handles.");
        }
        parsed.handleAttributes = entry;
    }
    function testAriaFormat(parsed, entry) {
        if (!isValidPartialFormatter(entry)) {
            throw new Error("noUiSlider: 'ariaFormat' requires 'to' method.");
        }
        parsed.ariaFormat = entry;
    }
    function testFormat(parsed, entry) {
        if (!isValidFormatter(entry)) {
            throw new Error("noUiSlider: 'format' requires 'to' and 'from' methods.");
        }
        parsed.format = entry;
    }
    function testKeyboardSupport(parsed, entry) {
        if (typeof entry !== "boolean") {
            throw new Error("noUiSlider: 'keyboardSupport' option must be a boolean.");
        }
        parsed.keyboardSupport = entry;
    }
    function testDocumentElement(parsed, entry) {
        // This is an advanced option. Passed values are used without validation.
        parsed.documentElement = entry;
    }
    function testCssPrefix(parsed, entry) {
        if (typeof entry !== "string" && entry !== false) {
            throw new Error("noUiSlider: 'cssPrefix' must be a string or `false`.");
        }
        parsed.cssPrefix = entry;
    }
    function testCssClasses(parsed, entry) {
        if (typeof entry !== "object") {
            throw new Error("noUiSlider: 'cssClasses' must be an object.");
        }
        if (typeof parsed.cssPrefix === "string") {
            parsed.cssClasses = {};
            Object.keys(entry).forEach(function (key) {
                parsed.cssClasses[key] = parsed.cssPrefix + entry[key];
            });
        }
        else {
            parsed.cssClasses = entry;
        }
    }
    // Test all developer settings and parse to assumption-safe values.
    function testOptions(options) {
        // To prove a fix for #537, freeze options here.
        // If the object is modified, an error will be thrown.
        // Object.freeze(options);
        var parsed = {
            margin: null,
            limit: null,
            padding: null,
            animate: true,
            animationDuration: 300,
            ariaFormat: defaultFormatter,
            format: defaultFormatter,
        };
        // Tests are executed in the order they are presented here.
        var tests = {
            step: { r: false, t: testStep },
            keyboardPageMultiplier: { r: false, t: testKeyboardPageMultiplier },
            keyboardMultiplier: { r: false, t: testKeyboardMultiplier },
            keyboardDefaultStep: { r: false, t: testKeyboardDefaultStep },
            start: { r: true, t: testStart },
            connect: { r: true, t: testConnect },
            direction: { r: true, t: testDirection },
            snap: { r: false, t: testSnap },
            animate: { r: false, t: testAnimate },
            animationDuration: { r: false, t: testAnimationDuration },
            range: { r: true, t: testRange },
            orientation: { r: false, t: testOrientation },
            margin: { r: false, t: testMargin },
            limit: { r: false, t: testLimit },
            padding: { r: false, t: testPadding },
            behaviour: { r: true, t: testBehaviour },
            ariaFormat: { r: false, t: testAriaFormat },
            format: { r: false, t: testFormat },
            tooltips: { r: false, t: testTooltips },
            keyboardSupport: { r: true, t: testKeyboardSupport },
            documentElement: { r: false, t: testDocumentElement },
            cssPrefix: { r: true, t: testCssPrefix },
            cssClasses: { r: true, t: testCssClasses },
            handleAttributes: { r: false, t: testHandleAttributes },
        };
        var defaults = {
            connect: false,
            direction: "ltr",
            behaviour: "tap",
            orientation: "horizontal",
            keyboardSupport: true,
            cssPrefix: "noUi-",
            cssClasses: cssClasses,
            keyboardPageMultiplier: 5,
            keyboardMultiplier: 1,
            keyboardDefaultStep: 10,
        };
        // AriaFormat defaults to regular format, if any.
        if (options.format && !options.ariaFormat) {
            options.ariaFormat = options.format;
        }
        // Run all options through a testing mechanism to ensure correct
        // input. It should be noted that options might get modified to
        // be handled properly. E.g. wrapping integers in arrays.
        Object.keys(tests).forEach(function (name) {
            // If the option isn't set, but it is required, throw an error.
            if (!isSet(options[name]) && defaults[name] === undefined) {
                if (tests[name].r) {
                    throw new Error("noUiSlider: '" + name + "' is required.");
                }
                return;
            }
            tests[name].t(parsed, !isSet(options[name]) ? defaults[name] : options[name]);
        });
        // Forward pips options
        parsed.pips = options.pips;
        // All recent browsers accept unprefixed transform.
        // We need -ms- for IE9 and -webkit- for older Android;
        // Assume use of -webkit- if unprefixed and -ms- are not supported.
        // https://caniuse.com/#feat=transforms2d
        var d = document.createElement("div");
        var msPrefix = d.style.msTransform !== undefined;
        var noPrefix = d.style.transform !== undefined;
        parsed.transformRule = noPrefix ? "transform" : msPrefix ? "msTransform" : "webkitTransform";
        // Pips don't move, so we can place them using left/top.
        var styles = [
            ["left", "top"],
            ["right", "bottom"],
        ];
        parsed.style = styles[parsed.dir][parsed.ort];
        return parsed;
    }
    //endregion
    function scope(target, options, originalOptions) {
        var actions = getActions();
        var supportsTouchActionNone = getSupportsTouchActionNone();
        var supportsPassive = supportsTouchActionNone && getSupportsPassive();
        // All variables local to 'scope' are prefixed with 'scope_'
        // Slider DOM Nodes
        var scope_Target = target;
        var scope_Base;
        var scope_Handles;
        var scope_Connects;
        var scope_Pips;
        var scope_Tooltips;
        // Slider state values
        var scope_Spectrum = options.spectrum;
        var scope_Values = [];
        var scope_Locations = [];
        var scope_HandleNumbers = [];
        var scope_ActiveHandlesCount = 0;
        var scope_Events = {};
        // Document Nodes
        var scope_Document = target.ownerDocument;
        var scope_DocumentElement = options.documentElement || scope_Document.documentElement;
        var scope_Body = scope_Document.body;
        // For horizontal sliders in standard ltr documents,
        // make .noUi-origin overflow to the left so the document doesn't scroll.
        var scope_DirOffset = scope_Document.dir === "rtl" || options.ort === 1 ? 0 : 100;
        // Creates a node, adds it to target, returns the new node.
        function addNodeTo(addTarget, className) {
            var div = scope_Document.createElement("div");
            if (className) {
                addClass(div, className);
            }
            addTarget.appendChild(div);
            return div;
        }
        // Append a origin to the base
        function addOrigin(base, handleNumber) {
            var origin = addNodeTo(base, options.cssClasses.origin);
            var handle = addNodeTo(origin, options.cssClasses.handle);
            addNodeTo(handle, options.cssClasses.touchArea);
            handle.setAttribute("data-handle", String(handleNumber));
            if (options.keyboardSupport) {
                // https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
                // 0 = focusable and reachable
                handle.setAttribute("tabindex", "0");
                handle.addEventListener("keydown", function (event) {
                    return eventKeydown(event, handleNumber);
                });
            }
            if (options.handleAttributes !== undefined) {
                var attributes_1 = options.handleAttributes[handleNumber];
                Object.keys(attributes_1).forEach(function (attribute) {
                    handle.setAttribute(attribute, attributes_1[attribute]);
                });
            }
            handle.setAttribute("role", "slider");
            handle.setAttribute("aria-orientation", options.ort ? "vertical" : "horizontal");
            if (handleNumber === 0) {
                addClass(handle, options.cssClasses.handleLower);
            }
            else if (handleNumber === options.handles - 1) {
                addClass(handle, options.cssClasses.handleUpper);
            }
            return origin;
        }
        // Insert nodes for connect elements
        function addConnect(base, add) {
            if (!add) {
                return false;
            }
            return addNodeTo(base, options.cssClasses.connect);
        }
        // Add handles to the slider base.
        function addElements(connectOptions, base) {
            var connectBase = addNodeTo(base, options.cssClasses.connects);
            scope_Handles = [];
            scope_Connects = [];
            scope_Connects.push(addConnect(connectBase, connectOptions[0]));
            // [::::O====O====O====]
            // connectOptions = [0, 1, 1, 1]
            for (var i = 0; i < options.handles; i++) {
                // Keep a list of all added handles.
                scope_Handles.push(addOrigin(base, i));
                scope_HandleNumbers[i] = i;
                scope_Connects.push(addConnect(connectBase, connectOptions[i + 1]));
            }
        }
        // Initialize a single slider.
        function addSlider(addTarget) {
            // Apply classes and data to the target.
            addClass(addTarget, options.cssClasses.target);
            if (options.dir === 0) {
                addClass(addTarget, options.cssClasses.ltr);
            }
            else {
                addClass(addTarget, options.cssClasses.rtl);
            }
            if (options.ort === 0) {
                addClass(addTarget, options.cssClasses.horizontal);
            }
            else {
                addClass(addTarget, options.cssClasses.vertical);
            }
            var textDirection = getComputedStyle(addTarget).direction;
            if (textDirection === "rtl") {
                addClass(addTarget, options.cssClasses.textDirectionRtl);
            }
            else {
                addClass(addTarget, options.cssClasses.textDirectionLtr);
            }
            return addNodeTo(addTarget, options.cssClasses.base);
        }
        function addTooltip(handle, handleNumber) {
            if (!options.tooltips || !options.tooltips[handleNumber]) {
                return false;
            }
            return addNodeTo(handle.firstChild, options.cssClasses.tooltip);
        }
        function isSliderDisabled() {
            return scope_Target.hasAttribute("disabled");
        }
        // Disable the slider dragging if any handle is disabled
        function isHandleDisabled(handleNumber) {
            var handleOrigin = scope_Handles[handleNumber];
            return handleOrigin.hasAttribute("disabled");
        }
        function removeTooltips() {
            if (scope_Tooltips) {
                removeEvent("update" + INTERNAL_EVENT_NS.tooltips);
                scope_Tooltips.forEach(function (tooltip) {
                    if (tooltip) {
                        removeElement(tooltip);
                    }
                });
                scope_Tooltips = null;
            }
        }
        // The tooltips option is a shorthand for using the 'update' event.
        function tooltips() {
            removeTooltips();
            // Tooltips are added with options.tooltips in original order.
            scope_Tooltips = scope_Handles.map(addTooltip);
            bindEvent("update" + INTERNAL_EVENT_NS.tooltips, function (values, handleNumber, unencoded) {
                if (!scope_Tooltips || !options.tooltips) {
                    return;
                }
                if (scope_Tooltips[handleNumber] === false) {
                    return;
                }
                var formattedValue = values[handleNumber];
                if (options.tooltips[handleNumber] !== true) {
                    formattedValue = options.tooltips[handleNumber].to(unencoded[handleNumber]);
                }
                scope_Tooltips[handleNumber].innerHTML = formattedValue;
            });
        }
        function aria() {
            removeEvent("update" + INTERNAL_EVENT_NS.aria);
            bindEvent("update" + INTERNAL_EVENT_NS.aria, function (values, handleNumber, unencoded, tap, positions) {
                // Update Aria Values for all handles, as a change in one changes min and max values for the next.
                scope_HandleNumbers.forEach(function (index) {
                    var handle = scope_Handles[index];
                    var min = checkHandlePosition(scope_Locations, index, 0, true, true, true);
                    var max = checkHandlePosition(scope_Locations, index, 100, true, true, true);
                    var now = positions[index];
                    // Formatted value for display
                    var text = String(options.ariaFormat.to(unencoded[index]));
                    // Map to slider range values
                    min = scope_Spectrum.fromStepping(min).toFixed(1);
                    max = scope_Spectrum.fromStepping(max).toFixed(1);
                    now = scope_Spectrum.fromStepping(now).toFixed(1);
                    handle.children[0].setAttribute("aria-valuemin", min);
                    handle.children[0].setAttribute("aria-valuemax", max);
                    handle.children[0].setAttribute("aria-valuenow", now);
                    handle.children[0].setAttribute("aria-valuetext", text);
                });
            });
        }
        function getGroup(pips) {
            // Use the range.
            if (pips.mode === exports.PipsMode.Range || pips.mode === exports.PipsMode.Steps) {
                return scope_Spectrum.xVal;
            }
            if (pips.mode === exports.PipsMode.Count) {
                if (pips.values < 2) {
                    throw new Error("noUiSlider: 'values' (>= 2) required for mode 'count'.");
                }
                // Divide 0 - 100 in 'count' parts.
                var interval = pips.values - 1;
                var spread = 100 / interval;
                var values = [];
                // List these parts and have them handled as 'positions'.
                while (interval--) {
                    values[interval] = interval * spread;
                }
                values.push(100);
                return mapToRange(values, pips.stepped);
            }
            if (pips.mode === exports.PipsMode.Positions) {
                // Map all percentages to on-range values.
                return mapToRange(pips.values, pips.stepped);
            }
            if (pips.mode === exports.PipsMode.Values) {
                // If the value must be stepped, it needs to be converted to a percentage first.
                if (pips.stepped) {
                    return pips.values.map(function (value) {
                        // Convert to percentage, apply step, return to value.
                        return scope_Spectrum.fromStepping(scope_Spectrum.getStep(scope_Spectrum.toStepping(value)));
                    });
                }
                // Otherwise, we can simply use the values.
                return pips.values;
            }
            return []; // pips.mode = never
        }
        function mapToRange(values, stepped) {
            return values.map(function (value) {
                return scope_Spectrum.fromStepping(stepped ? scope_Spectrum.getStep(value) : value);
            });
        }
        function generateSpread(pips) {
            function safeIncrement(value, increment) {
                // Avoid floating point variance by dropping the smallest decimal places.
                return Number((value + increment).toFixed(7));
            }
            var group = getGroup(pips);
            var indexes = {};
            var firstInRange = scope_Spectrum.xVal[0];
            var lastInRange = scope_Spectrum.xVal[scope_Spectrum.xVal.length - 1];
            var ignoreFirst = false;
            var ignoreLast = false;
            var prevPct = 0;
            // Create a copy of the group, sort it and filter away all duplicates.
            group = unique(group.slice().sort(function (a, b) {
                return a - b;
            }));
            // Make sure the range starts with the first element.
            if (group[0] !== firstInRange) {
                group.unshift(firstInRange);
                ignoreFirst = true;
            }
            // Likewise for the last one.
            if (group[group.length - 1] !== lastInRange) {
                group.push(lastInRange);
                ignoreLast = true;
            }
            group.forEach(function (current, index) {
                // Get the current step and the lower + upper positions.
                var step;
                var i;
                var q;
                var low = current;
                var high = group[index + 1];
                var newPct;
                var pctDifference;
                var pctPos;
                var type;
                var steps;
                var realSteps;
                var stepSize;
                var isSteps = pips.mode === exports.PipsMode.Steps;
                // When using 'steps' mode, use the provided steps.
                // Otherwise, we'll step on to the next subrange.
                if (isSteps) {
                    step = scope_Spectrum.xNumSteps[index];
                }
                // Default to a 'full' step.
                if (!step) {
                    step = high - low;
                }
                // If high is undefined we are at the last subrange. Make sure it iterates once (#1088)
                if (high === undefined) {
                    high = low;
                }
                // Make sure step isn't 0, which would cause an infinite loop (#654)
                step = Math.max(step, 0.0000001);
                // Find all steps in the subrange.
                for (i = low; i <= high; i = safeIncrement(i, step)) {
                    // Get the percentage value for the current step,
                    // calculate the size for the subrange.
                    newPct = scope_Spectrum.toStepping(i);
                    pctDifference = newPct - prevPct;
                    steps = pctDifference / (pips.density || 1);
                    realSteps = Math.round(steps);
                    // This ratio represents the amount of percentage-space a point indicates.
                    // For a density 1 the points/percentage = 1. For density 2, that percentage needs to be re-divided.
                    // Round the percentage offset to an even number, then divide by two
                    // to spread the offset on both sides of the range.
                    stepSize = pctDifference / realSteps;
                    // Divide all points evenly, adding the correct number to this subrange.
                    // Run up to <= so that 100% gets a point, event if ignoreLast is set.
                    for (q = 1; q <= realSteps; q += 1) {
                        // The ratio between the rounded value and the actual size might be ~1% off.
                        // Correct the percentage offset by the number of points
                        // per subrange. density = 1 will result in 100 points on the
                        // full range, 2 for 50, 4 for 25, etc.
                        pctPos = prevPct + q * stepSize;
                        indexes[pctPos.toFixed(5)] = [scope_Spectrum.fromStepping(pctPos), 0];
                    }
                    // Determine the point type.
                    type = group.indexOf(i) > -1 ? exports.PipsType.LargeValue : isSteps ? exports.PipsType.SmallValue : exports.PipsType.NoValue;
                    // Enforce the 'ignoreFirst' option by overwriting the type for 0.
                    if (!index && ignoreFirst && i !== high) {
                        type = 0;
                    }
                    if (!(i === high && ignoreLast)) {
                        // Mark the 'type' of this point. 0 = plain, 1 = real value, 2 = step value.
                        indexes[newPct.toFixed(5)] = [i, type];
                    }
                    // Update the percentage count.
                    prevPct = newPct;
                }
            });
            return indexes;
        }
        function addMarking(spread, filterFunc, formatter) {
            var _a, _b;
            var element = scope_Document.createElement("div");
            var valueSizeClasses = (_a = {},
                _a[exports.PipsType.None] = "",
                _a[exports.PipsType.NoValue] = options.cssClasses.valueNormal,
                _a[exports.PipsType.LargeValue] = options.cssClasses.valueLarge,
                _a[exports.PipsType.SmallValue] = options.cssClasses.valueSub,
                _a);
            var markerSizeClasses = (_b = {},
                _b[exports.PipsType.None] = "",
                _b[exports.PipsType.NoValue] = options.cssClasses.markerNormal,
                _b[exports.PipsType.LargeValue] = options.cssClasses.markerLarge,
                _b[exports.PipsType.SmallValue] = options.cssClasses.markerSub,
                _b);
            var valueOrientationClasses = [options.cssClasses.valueHorizontal, options.cssClasses.valueVertical];
            var markerOrientationClasses = [options.cssClasses.markerHorizontal, options.cssClasses.markerVertical];
            addClass(element, options.cssClasses.pips);
            addClass(element, options.ort === 0 ? options.cssClasses.pipsHorizontal : options.cssClasses.pipsVertical);
            function getClasses(type, source) {
                var a = source === options.cssClasses.value;
                var orientationClasses = a ? valueOrientationClasses : markerOrientationClasses;
                var sizeClasses = a ? valueSizeClasses : markerSizeClasses;
                return source + " " + orientationClasses[options.ort] + " " + sizeClasses[type];
            }
            function addSpread(offset, value, type) {
                // Apply the filter function, if it is set.
                type = filterFunc ? filterFunc(value, type) : type;
                if (type === exports.PipsType.None) {
                    return;
                }
                // Add a marker for every point
                var node = addNodeTo(element, false);
                node.className = getClasses(type, options.cssClasses.marker);
                node.style[options.style] = offset + "%";
                // Values are only appended for points marked '1' or '2'.
                if (type > exports.PipsType.NoValue) {
                    node = addNodeTo(element, false);
                    node.className = getClasses(type, options.cssClasses.value);
                    node.setAttribute("data-value", String(value));
                    node.style[options.style] = offset + "%";
                    node.innerHTML = String(formatter.to(value));
                }
            }
            // Append all points.
            Object.keys(spread).forEach(function (offset) {
                addSpread(offset, spread[offset][0], spread[offset][1]);
            });
            return element;
        }
        function removePips() {
            if (scope_Pips) {
                removeElement(scope_Pips);
                scope_Pips = null;
            }
        }
        function pips(pips) {
            // Fix #669
            removePips();
            var spread = generateSpread(pips);
            var filter = pips.filter;
            var format = pips.format || {
                to: function (value) {
                    return String(Math.round(value));
                },
            };
            scope_Pips = scope_Target.appendChild(addMarking(spread, filter, format));
            return scope_Pips;
        }
        // Shorthand for base dimensions.
        function baseSize() {
            var rect = scope_Base.getBoundingClientRect();
            var alt = ("offset" + ["Width", "Height"][options.ort]);
            return options.ort === 0 ? rect.width || scope_Base[alt] : rect.height || scope_Base[alt];
        }
        // Handler for attaching events trough a proxy.
        function attachEvent(events, element, callback, data) {
            // This function can be used to 'filter' events to the slider.
            // element is a node, not a nodeList
            var method = function (event) {
                var e = fixEvent(event, data.pageOffset, data.target || element);
                // fixEvent returns false if this event has a different target
                // when handling (multi-) touch events;
                if (!e) {
                    return false;
                }
                // doNotReject is passed by all end events to make sure released touches
                // are not rejected, leaving the slider "stuck" to the cursor;
                if (isSliderDisabled() && !data.doNotReject) {
                    return false;
                }
                // Stop if an active 'tap' transition is taking place.
                if (hasClass(scope_Target, options.cssClasses.tap) && !data.doNotReject) {
                    return false;
                }
                // Ignore right or middle clicks on start #454
                if (events === actions.start && e.buttons !== undefined && e.buttons > 1) {
                    return false;
                }
                // Ignore right or middle clicks on start #454
                if (data.hover && e.buttons) {
                    return false;
                }
                // 'supportsPassive' is only true if a browser also supports touch-action: none in CSS.
                // iOS safari does not, so it doesn't get to benefit from passive scrolling. iOS does support
                // touch-action: manipulation, but that allows panning, which breaks
                // sliders after zooming/on non-responsive pages.
                // See: https://bugs.webkit.org/show_bug.cgi?id=133112
                if (!supportsPassive) {
                    e.preventDefault();
                }
                e.calcPoint = e.points[options.ort];
                // Call the event handler with the event [ and additional data ].
                callback(e, data);
                return;
            };
            var methods = [];
            // Bind a closure on the target for every event type.
            events.split(" ").forEach(function (eventName) {
                element.addEventListener(eventName, method, supportsPassive ? { passive: true } : false);
                methods.push([eventName, method]);
            });
            return methods;
        }
        // Provide a clean event with standardized offset values.
        function fixEvent(e, pageOffset, eventTarget) {
            // Filter the event to register the type, which can be
            // touch, mouse or pointer. Offset changes need to be
            // made on an event specific basis.
            var touch = e.type.indexOf("touch") === 0;
            var mouse = e.type.indexOf("mouse") === 0;
            var pointer = e.type.indexOf("pointer") === 0;
            var x = 0;
            var y = 0;
            // IE10 implemented pointer events with a prefix;
            if (e.type.indexOf("MSPointer") === 0) {
                pointer = true;
            }
            // Erroneous events seem to be passed in occasionally on iOS/iPadOS after user finishes interacting with
            // the slider. They appear to be of type MouseEvent, yet they don't have usual properties set. Ignore
            // events that have no touches or buttons associated with them. (#1057, #1079, #1095)
            if (e.type === "mousedown" && !e.buttons && !e.touches) {
                return false;
            }
            // The only thing one handle should be concerned about is the touches that originated on top of it.
            if (touch) {
                // Returns true if a touch originated on the target.
                var isTouchOnTarget = function (checkTouch) {
                    var target = checkTouch.target;
                    return (target === eventTarget ||
                        eventTarget.contains(target) ||
                        (e.composed && e.composedPath().shift() === eventTarget));
                };
                // In the case of touchstart events, we need to make sure there is still no more than one
                // touch on the target so we look amongst all touches.
                if (e.type === "touchstart") {
                    var targetTouches = Array.prototype.filter.call(e.touches, isTouchOnTarget);
                    // Do not support more than one touch per handle.
                    if (targetTouches.length > 1) {
                        return false;
                    }
                    x = targetTouches[0].pageX;
                    y = targetTouches[0].pageY;
                }
                else {
                    // In the other cases, find on changedTouches is enough.
                    var targetTouch = Array.prototype.find.call(e.changedTouches, isTouchOnTarget);
                    // Cancel if the target touch has not moved.
                    if (!targetTouch) {
                        return false;
                    }
                    x = targetTouch.pageX;
                    y = targetTouch.pageY;
                }
            }
            pageOffset = pageOffset || getPageOffset(scope_Document);
            if (mouse || pointer) {
                x = e.clientX + pageOffset.x;
                y = e.clientY + pageOffset.y;
            }
            e.pageOffset = pageOffset;
            e.points = [x, y];
            e.cursor = mouse || pointer; // Fix #435
            return e;
        }
        // Translate a coordinate in the document to a percentage on the slider
        function calcPointToPercentage(calcPoint) {
            var location = calcPoint - offset(scope_Base, options.ort);
            var proposal = (location * 100) / baseSize();
            // Clamp proposal between 0% and 100%
            // Out-of-bound coordinates may occur when .noUi-base pseudo-elements
            // are used (e.g. contained handles feature)
            proposal = limit(proposal);
            return options.dir ? 100 - proposal : proposal;
        }
        // Find handle closest to a certain percentage on the slider
        function getClosestHandle(clickedPosition) {
            var smallestDifference = 100;
            var handleNumber = false;
            scope_Handles.forEach(function (handle, index) {
                // Disabled handles are ignored
                if (isHandleDisabled(index)) {
                    return;
                }
                var handlePosition = scope_Locations[index];
                var differenceWithThisHandle = Math.abs(handlePosition - clickedPosition);
                // Initial state
                var clickAtEdge = differenceWithThisHandle === 100 && smallestDifference === 100;
                // Difference with this handle is smaller than the previously checked handle
                var isCloser = differenceWithThisHandle < smallestDifference;
                var isCloserAfter = differenceWithThisHandle <= smallestDifference && clickedPosition > handlePosition;
                if (isCloser || isCloserAfter || clickAtEdge) {
                    handleNumber = index;
                    smallestDifference = differenceWithThisHandle;
                }
            });
            return handleNumber;
        }
        // Fire 'end' when a mouse or pen leaves the document.
        function documentLeave(event, data) {
            if (event.type === "mouseout" &&
                event.target.nodeName === "HTML" &&
                event.relatedTarget === null) {
                eventEnd(event, data);
            }
        }
        // Handle movement on document for handle and range drag.
        function eventMove(event, data) {
            // Fix #498
            // Check value of .buttons in 'start' to work around a bug in IE10 mobile (data.buttonsProperty).
            // https://connect.microsoft.com/IE/feedback/details/927005/mobile-ie10-windows-phone-buttons-property-of-pointermove-event-always-zero
            // IE9 has .buttons and .which zero on mousemove.
            // Firefox breaks the spec MDN defines.
            if (navigator.appVersion.indexOf("MSIE 9") === -1 && event.buttons === 0 && data.buttonsProperty !== 0) {
                return eventEnd(event, data);
            }
            // Check if we are moving up or down
            var movement = (options.dir ? -1 : 1) * (event.calcPoint - data.startCalcPoint);
            // Convert the movement into a percentage of the slider width/height
            var proposal = (movement * 100) / data.baseSize;
            moveHandles(movement > 0, proposal, data.locations, data.handleNumbers, data.connect);
        }
        // Unbind move events on document, call callbacks.
        function eventEnd(event, data) {
            // The handle is no longer active, so remove the class.
            if (data.handle) {
                removeClass(data.handle, options.cssClasses.active);
                scope_ActiveHandlesCount -= 1;
            }
            // Unbind the move and end events, which are added on 'start'.
            data.listeners.forEach(function (c) {
                scope_DocumentElement.removeEventListener(c[0], c[1]);
            });
            if (scope_ActiveHandlesCount === 0) {
                // Remove dragging class.
                removeClass(scope_Target, options.cssClasses.drag);
                setZindex();
                // Remove cursor styles and text-selection events bound to the body.
                if (event.cursor) {
                    scope_Body.style.cursor = "";
                    scope_Body.removeEventListener("selectstart", preventDefault);
                }
            }
            data.handleNumbers.forEach(function (handleNumber) {
                fireEvent("change", handleNumber);
                fireEvent("set", handleNumber);
                fireEvent("end", handleNumber);
            });
        }
        // Bind move events on document.
        function eventStart(event, data) {
            // Ignore event if any handle is disabled
            if (data.handleNumbers.some(isHandleDisabled)) {
                return;
            }
            var handle;
            if (data.handleNumbers.length === 1) {
                var handleOrigin = scope_Handles[data.handleNumbers[0]];
                handle = handleOrigin.children[0];
                scope_ActiveHandlesCount += 1;
                // Mark the handle as 'active' so it can be styled.
                addClass(handle, options.cssClasses.active);
            }
            // A drag should never propagate up to the 'tap' event.
            event.stopPropagation();
            // Record the event listeners.
            var listeners = [];
            // Attach the move and end events.
            var moveEvent = attachEvent(actions.move, scope_DocumentElement, eventMove, {
                // The event target has changed so we need to propagate the original one so that we keep
                // relying on it to extract target touches.
                target: event.target,
                handle: handle,
                connect: data.connect,
                listeners: listeners,
                startCalcPoint: event.calcPoint,
                baseSize: baseSize(),
                pageOffset: event.pageOffset,
                handleNumbers: data.handleNumbers,
                buttonsProperty: event.buttons,
                locations: scope_Locations.slice(),
            });
            var endEvent = attachEvent(actions.end, scope_DocumentElement, eventEnd, {
                target: event.target,
                handle: handle,
                listeners: listeners,
                doNotReject: true,
                handleNumbers: data.handleNumbers,
            });
            var outEvent = attachEvent("mouseout", scope_DocumentElement, documentLeave, {
                target: event.target,
                handle: handle,
                listeners: listeners,
                doNotReject: true,
                handleNumbers: data.handleNumbers,
            });
            // We want to make sure we pushed the listeners in the listener list rather than creating
            // a new one as it has already been passed to the event handlers.
            listeners.push.apply(listeners, moveEvent.concat(endEvent, outEvent));
            // Text selection isn't an issue on touch devices,
            // so adding cursor styles can be skipped.
            if (event.cursor) {
                // Prevent the 'I' cursor and extend the range-drag cursor.
                scope_Body.style.cursor = getComputedStyle(event.target).cursor;
                // Mark the target with a dragging state.
                if (scope_Handles.length > 1) {
                    addClass(scope_Target, options.cssClasses.drag);
                }
                // Prevent text selection when dragging the handles.
                // In noUiSlider <= 9.2.0, this was handled by calling preventDefault on mouse/touch start/move,
                // which is scroll blocking. The selectstart event is supported by FireFox starting from version 52,
                // meaning the only holdout is iOS Safari. This doesn't matter: text selection isn't triggered there.
                // The 'cursor' flag is false.
                // See: http://caniuse.com/#search=selectstart
                scope_Body.addEventListener("selectstart", preventDefault, false);
            }
            data.handleNumbers.forEach(function (handleNumber) {
                fireEvent("start", handleNumber);
            });
        }
        // Move closest handle to tapped location.
        function eventTap(event) {
            // The tap event shouldn't propagate up
            event.stopPropagation();
            var proposal = calcPointToPercentage(event.calcPoint);
            var handleNumber = getClosestHandle(proposal);
            // Tackle the case that all handles are 'disabled'.
            if (handleNumber === false) {
                return;
            }
            // Flag the slider as it is now in a transitional state.
            // Transition takes a configurable amount of ms (default 300). Re-enable the slider after that.
            if (!options.events.snap) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }
            setHandle(handleNumber, proposal, true, true);
            setZindex();
            fireEvent("slide", handleNumber, true);
            fireEvent("update", handleNumber, true);
            if (!options.events.snap) {
                fireEvent("change", handleNumber, true);
                fireEvent("set", handleNumber, true);
            }
            else {
                eventStart(event, { handleNumbers: [handleNumber] });
            }
        }
        // Fires a 'hover' event for a hovered mouse/pen position.
        function eventHover(event) {
            var proposal = calcPointToPercentage(event.calcPoint);
            var to = scope_Spectrum.getStep(proposal);
            var value = scope_Spectrum.fromStepping(to);
            Object.keys(scope_Events).forEach(function (targetEvent) {
                if ("hover" === targetEvent.split(".")[0]) {
                    scope_Events[targetEvent].forEach(function (callback) {
                        callback.call(scope_Self, value);
                    });
                }
            });
        }
        // Handles keydown on focused handles
        // Don't move the document when pressing arrow keys on focused handles
        function eventKeydown(event, handleNumber) {
            if (isSliderDisabled() || isHandleDisabled(handleNumber)) {
                return false;
            }
            var horizontalKeys = ["Left", "Right"];
            var verticalKeys = ["Down", "Up"];
            var largeStepKeys = ["PageDown", "PageUp"];
            var edgeKeys = ["Home", "End"];
            if (options.dir && !options.ort) {
                // On an right-to-left slider, the left and right keys act inverted
                horizontalKeys.reverse();
            }
            else if (options.ort && !options.dir) {
                // On a top-to-bottom slider, the up and down keys act inverted
                verticalKeys.reverse();
                largeStepKeys.reverse();
            }
            // Strip "Arrow" for IE compatibility. https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
            var key = event.key.replace("Arrow", "");
            var isLargeDown = key === largeStepKeys[0];
            var isLargeUp = key === largeStepKeys[1];
            var isDown = key === verticalKeys[0] || key === horizontalKeys[0] || isLargeDown;
            var isUp = key === verticalKeys[1] || key === horizontalKeys[1] || isLargeUp;
            var isMin = key === edgeKeys[0];
            var isMax = key === edgeKeys[1];
            if (!isDown && !isUp && !isMin && !isMax) {
                return true;
            }
            event.preventDefault();
            var to;
            if (isUp || isDown) {
                var direction = isDown ? 0 : 1;
                var steps = getNextStepsForHandle(handleNumber);
                var step = steps[direction];
                // At the edge of a slider, do nothing
                if (step === null) {
                    return false;
                }
                // No step set, use the default of 10% of the sub-range
                if (step === false) {
                    step = scope_Spectrum.getDefaultStep(scope_Locations[handleNumber], isDown, options.keyboardDefaultStep);
                }
                if (isLargeUp || isLargeDown) {
                    step *= options.keyboardPageMultiplier;
                }
                else {
                    step *= options.keyboardMultiplier;
                }
                // Step over zero-length ranges (#948);
                step = Math.max(step, 0.0000001);
                // Decrement for down steps
                step = (isDown ? -1 : 1) * step;
                to = scope_Values[handleNumber] + step;
            }
            else if (isMax) {
                // End key
                to = options.spectrum.xVal[options.spectrum.xVal.length - 1];
            }
            else {
                // Home key
                to = options.spectrum.xVal[0];
            }
            setHandle(handleNumber, scope_Spectrum.toStepping(to), true, true);
            fireEvent("slide", handleNumber);
            fireEvent("update", handleNumber);
            fireEvent("change", handleNumber);
            fireEvent("set", handleNumber);
            return false;
        }
        // Attach events to several slider parts.
        function bindSliderEvents(behaviour) {
            // Attach the standard drag event to the handles.
            if (!behaviour.fixed) {
                scope_Handles.forEach(function (handle, index) {
                    // These events are only bound to the visual handle
                    // element, not the 'real' origin element.
                    attachEvent(actions.start, handle.children[0], eventStart, {
                        handleNumbers: [index],
                    });
                });
            }
            // Attach the tap event to the slider base.
            if (behaviour.tap) {
                attachEvent(actions.start, scope_Base, eventTap, {});
            }
            // Fire hover events
            if (behaviour.hover) {
                attachEvent(actions.move, scope_Base, eventHover, {
                    hover: true,
                });
            }
            // Make the range draggable.
            if (behaviour.drag) {
                scope_Connects.forEach(function (connect, index) {
                    if (connect === false || index === 0 || index === scope_Connects.length - 1) {
                        return;
                    }
                    var handleBefore = scope_Handles[index - 1];
                    var handleAfter = scope_Handles[index];
                    var eventHolders = [connect];
                    var handlesToDrag = [handleBefore, handleAfter];
                    var handleNumbersToDrag = [index - 1, index];
                    addClass(connect, options.cssClasses.draggable);
                    // When the range is fixed, the entire range can
                    // be dragged by the handles. The handle in the first
                    // origin will propagate the start event upward,
                    // but it needs to be bound manually on the other.
                    if (behaviour.fixed) {
                        eventHolders.push(handleBefore.children[0]);
                        eventHolders.push(handleAfter.children[0]);
                    }
                    if (behaviour.dragAll) {
                        handlesToDrag = scope_Handles;
                        handleNumbersToDrag = scope_HandleNumbers;
                    }
                    eventHolders.forEach(function (eventHolder) {
                        attachEvent(actions.start, eventHolder, eventStart, {
                            handles: handlesToDrag,
                            handleNumbers: handleNumbersToDrag,
                            connect: connect,
                        });
                    });
                });
            }
        }
        // Attach an event to this slider, possibly including a namespace
        function bindEvent(namespacedEvent, callback) {
            scope_Events[namespacedEvent] = scope_Events[namespacedEvent] || [];
            scope_Events[namespacedEvent].push(callback);
            // If the event bound is 'update,' fire it immediately for all handles.
            if (namespacedEvent.split(".")[0] === "update") {
                scope_Handles.forEach(function (a, index) {
                    fireEvent("update", index);
                });
            }
        }
        function isInternalNamespace(namespace) {
            return namespace === INTERNAL_EVENT_NS.aria || namespace === INTERNAL_EVENT_NS.tooltips;
        }
        // Undo attachment of event
        function removeEvent(namespacedEvent) {
            var event = namespacedEvent && namespacedEvent.split(".")[0];
            var namespace = event ? namespacedEvent.substring(event.length) : namespacedEvent;
            Object.keys(scope_Events).forEach(function (bind) {
                var tEvent = bind.split(".")[0];
                var tNamespace = bind.substring(tEvent.length);
                if ((!event || event === tEvent) && (!namespace || namespace === tNamespace)) {
                    // only delete protected internal event if intentional
                    if (!isInternalNamespace(tNamespace) || namespace === tNamespace) {
                        delete scope_Events[bind];
                    }
                }
            });
        }
        // External event handling
        function fireEvent(eventName, handleNumber, tap) {
            Object.keys(scope_Events).forEach(function (targetEvent) {
                var eventType = targetEvent.split(".")[0];
                if (eventName === eventType) {
                    scope_Events[targetEvent].forEach(function (callback) {
                        callback.call(
                        // Use the slider public API as the scope ('this')
                        scope_Self, 
                        // Return values as array, so arg_1[arg_2] is always valid.
                        scope_Values.map(options.format.to), 
                        // Handle index, 0 or 1
                        handleNumber, 
                        // Un-formatted slider values
                        scope_Values.slice(), 
                        // Event is fired by tap, true or false
                        tap || false, 
                        // Left offset of the handle, in relation to the slider
                        scope_Locations.slice(), 
                        // add the slider public API to an accessible parameter when this is unavailable
                        scope_Self);
                    });
                }
            });
        }
        // Split out the handle positioning logic so the Move event can use it, too
        function checkHandlePosition(reference, handleNumber, to, lookBackward, lookForward, getValue) {
            var distance;
            // For sliders with multiple handles, limit movement to the other handle.
            // Apply the margin option by adding it to the handle positions.
            if (scope_Handles.length > 1 && !options.events.unconstrained) {
                if (lookBackward && handleNumber > 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.margin, false);
                    to = Math.max(to, distance);
                }
                if (lookForward && handleNumber < scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.margin, true);
                    to = Math.min(to, distance);
                }
            }
            // The limit option has the opposite effect, limiting handles to a
            // maximum distance from another. Limit must be > 0, as otherwise
            // handles would be unmovable.
            if (scope_Handles.length > 1 && options.limit) {
                if (lookBackward && handleNumber > 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber - 1], options.limit, false);
                    to = Math.min(to, distance);
                }
                if (lookForward && handleNumber < scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(reference[handleNumber + 1], options.limit, true);
                    to = Math.max(to, distance);
                }
            }
            // The padding option keeps the handles a certain distance from the
            // edges of the slider. Padding must be > 0.
            if (options.padding) {
                if (handleNumber === 0) {
                    distance = scope_Spectrum.getAbsoluteDistance(0, options.padding[0], false);
                    to = Math.max(to, distance);
                }
                if (handleNumber === scope_Handles.length - 1) {
                    distance = scope_Spectrum.getAbsoluteDistance(100, options.padding[1], true);
                    to = Math.min(to, distance);
                }
            }
            to = scope_Spectrum.getStep(to);
            // Limit percentage to the 0 - 100 range
            to = limit(to);
            // Return false if handle can't move
            if (to === reference[handleNumber] && !getValue) {
                return false;
            }
            return to;
        }
        // Uses slider orientation to create CSS rules. a = base value;
        function inRuleOrder(v, a) {
            var o = options.ort;
            return (o ? a : v) + ", " + (o ? v : a);
        }
        // Moves handle(s) by a percentage
        // (bool, % to move, [% where handle started, ...], [index in scope_Handles, ...])
        function moveHandles(upward, proposal, locations, handleNumbers, connect) {
            var proposals = locations.slice();
            // Store first handle now, so we still have it in case handleNumbers is reversed
            var firstHandle = handleNumbers[0];
            var b = [!upward, upward];
            var f = [upward, !upward];
            // Copy handleNumbers so we don't change the dataset
            handleNumbers = handleNumbers.slice();
            // Check to see which handle is 'leading'.
            // If that one can't move the second can't either.
            if (upward) {
                handleNumbers.reverse();
            }
            // Step 1: get the maximum percentage that any of the handles can move
            if (handleNumbers.length > 1) {
                handleNumbers.forEach(function (handleNumber, o) {
                    var to = checkHandlePosition(proposals, handleNumber, proposals[handleNumber] + proposal, b[o], f[o], false);
                    // Stop if one of the handles can't move.
                    if (to === false) {
                        proposal = 0;
                    }
                    else {
                        proposal = to - proposals[handleNumber];
                        proposals[handleNumber] = to;
                    }
                });
            }
            // If using one handle, check backward AND forward
            else {
                b = f = [true];
            }
            var state = false;
            // Step 2: Try to set the handles with the found percentage
            handleNumbers.forEach(function (handleNumber, o) {
                state = setHandle(handleNumber, locations[handleNumber] + proposal, b[o], f[o]) || state;
            });
            // Step 3: If a handle moved, fire events
            if (state) {
                handleNumbers.forEach(function (handleNumber) {
                    fireEvent("update", handleNumber);
                    fireEvent("slide", handleNumber);
                });
                // If target is a connect, then fire drag event
                if (connect != undefined) {
                    fireEvent("drag", firstHandle);
                }
            }
        }
        // Takes a base value and an offset. This offset is used for the connect bar size.
        // In the initial design for this feature, the origin element was 1% wide.
        // Unfortunately, a rounding bug in Chrome makes it impossible to implement this feature
        // in this manner: https://bugs.chromium.org/p/chromium/issues/detail?id=798223
        function transformDirection(a, b) {
            return options.dir ? 100 - a - b : a;
        }
        // Updates scope_Locations and scope_Values, updates visual state
        function updateHandlePosition(handleNumber, to) {
            // Update locations.
            scope_Locations[handleNumber] = to;
            // Convert the value to the slider stepping/range.
            scope_Values[handleNumber] = scope_Spectrum.fromStepping(to);
            var translation = transformDirection(to, 0) - scope_DirOffset;
            var translateRule = "translate(" + inRuleOrder(translation + "%", "0") + ")";
            scope_Handles[handleNumber].style[options.transformRule] = translateRule;
            updateConnect(handleNumber);
            updateConnect(handleNumber + 1);
        }
        // Handles before the slider middle are stacked later = higher,
        // Handles after the middle later is lower
        // [[7] [8] .......... | .......... [5] [4]
        function setZindex() {
            scope_HandleNumbers.forEach(function (handleNumber) {
                var dir = scope_Locations[handleNumber] > 50 ? -1 : 1;
                var zIndex = 3 + (scope_Handles.length + dir * handleNumber);
                scope_Handles[handleNumber].style.zIndex = String(zIndex);
            });
        }
        // Test suggested values and apply margin, step.
        // if exactInput is true, don't run checkHandlePosition, then the handle can be placed in between steps (#436)
        function setHandle(handleNumber, to, lookBackward, lookForward, exactInput) {
            if (!exactInput) {
                to = checkHandlePosition(scope_Locations, handleNumber, to, lookBackward, lookForward, false);
            }
            if (to === false) {
                return false;
            }
            updateHandlePosition(handleNumber, to);
            return true;
        }
        // Updates style attribute for connect nodes
        function updateConnect(index) {
            // Skip connects set to false
            if (!scope_Connects[index]) {
                return;
            }
            var l = 0;
            var h = 100;
            if (index !== 0) {
                l = scope_Locations[index - 1];
            }
            if (index !== scope_Connects.length - 1) {
                h = scope_Locations[index];
            }
            // We use two rules:
            // 'translate' to change the left/top offset;
            // 'scale' to change the width of the element;
            // As the element has a width of 100%, a translation of 100% is equal to 100% of the parent (.noUi-base)
            var connectWidth = h - l;
            var translateRule = "translate(" + inRuleOrder(transformDirection(l, connectWidth) + "%", "0") + ")";
            var scaleRule = "scale(" + inRuleOrder(connectWidth / 100, "1") + ")";
            scope_Connects[index].style[options.transformRule] =
                translateRule + " " + scaleRule;
        }
        // Parses value passed to .set method. Returns current value if not parse-able.
        function resolveToValue(to, handleNumber) {
            // Setting with null indicates an 'ignore'.
            // Inputting 'false' is invalid.
            if (to === null || to === false || to === undefined) {
                return scope_Locations[handleNumber];
            }
            // If a formatted number was passed, attempt to decode it.
            if (typeof to === "number") {
                to = String(to);
            }
            to = options.format.from(to);
            if (to !== false) {
                to = scope_Spectrum.toStepping(to);
            }
            // If parsing the number failed, use the current value.
            if (to === false || isNaN(to)) {
                return scope_Locations[handleNumber];
            }
            return to;
        }
        // Set the slider value.
        function valueSet(input, fireSetEvent, exactInput) {
            var values = asArray(input);
            var isInit = scope_Locations[0] === undefined;
            // Event fires by default
            fireSetEvent = fireSetEvent === undefined ? true : fireSetEvent;
            // Animation is optional.
            // Make sure the initial values were set before using animated placement.
            if (options.animate && !isInit) {
                addClassFor(scope_Target, options.cssClasses.tap, options.animationDuration);
            }
            // First pass, without lookAhead but with lookBackward. Values are set from left to right.
            scope_HandleNumbers.forEach(function (handleNumber) {
                setHandle(handleNumber, resolveToValue(values[handleNumber], handleNumber), true, false, exactInput);
            });
            var i = scope_HandleNumbers.length === 1 ? 0 : 1;
            // Spread handles evenly across the slider if the range has no size (min=max)
            if (isInit && scope_Spectrum.hasNoSize()) {
                exactInput = true;
                scope_Locations[0] = 0;
                if (scope_HandleNumbers.length > 1) {
                    var space_1 = 100 / (scope_HandleNumbers.length - 1);
                    scope_HandleNumbers.forEach(function (handleNumber) {
                        scope_Locations[handleNumber] = handleNumber * space_1;
                    });
                }
            }
            // Secondary passes. Now that all base values are set, apply constraints.
            // Iterate all handles to ensure constraints are applied for the entire slider (Issue #1009)
            for (; i < scope_HandleNumbers.length; ++i) {
                scope_HandleNumbers.forEach(function (handleNumber) {
                    setHandle(handleNumber, scope_Locations[handleNumber], true, true, exactInput);
                });
            }
            setZindex();
            scope_HandleNumbers.forEach(function (handleNumber) {
                fireEvent("update", handleNumber);
                // Fire the event only for handles that received a new value, as per #579
                if (values[handleNumber] !== null && fireSetEvent) {
                    fireEvent("set", handleNumber);
                }
            });
        }
        // Reset slider to initial values
        function valueReset(fireSetEvent) {
            valueSet(options.start, fireSetEvent);
        }
        // Set value for a single handle
        function valueSetHandle(handleNumber, value, fireSetEvent, exactInput) {
            // Ensure numeric input
            handleNumber = Number(handleNumber);
            if (!(handleNumber >= 0 && handleNumber < scope_HandleNumbers.length)) {
                throw new Error("noUiSlider: invalid handle number, got: " + handleNumber);
            }
            // Look both backward and forward, since we don't want this handle to "push" other handles (#960);
            // The exactInput argument can be used to ignore slider stepping (#436)
            setHandle(handleNumber, resolveToValue(value, handleNumber), true, true, exactInput);
            fireEvent("update", handleNumber);
            if (fireSetEvent) {
                fireEvent("set", handleNumber);
            }
        }
        // Get the slider value.
        function valueGet(unencoded) {
            if (unencoded === void 0) { unencoded = false; }
            if (unencoded) {
                // return a copy of the raw values
                return scope_Values.length === 1 ? scope_Values[0] : scope_Values.slice(0);
            }
            var values = scope_Values.map(options.format.to);
            // If only one handle is used, return a single value.
            if (values.length === 1) {
                return values[0];
            }
            return values;
        }
        // Removes classes from the root and empties it.
        function destroy() {
            // remove protected internal listeners
            removeEvent(INTERNAL_EVENT_NS.aria);
            removeEvent(INTERNAL_EVENT_NS.tooltips);
            Object.keys(options.cssClasses).forEach(function (key) {
                removeClass(scope_Target, options.cssClasses[key]);
            });
            while (scope_Target.firstChild) {
                scope_Target.removeChild(scope_Target.firstChild);
            }
            delete scope_Target.noUiSlider;
        }
        function getNextStepsForHandle(handleNumber) {
            var location = scope_Locations[handleNumber];
            var nearbySteps = scope_Spectrum.getNearbySteps(location);
            var value = scope_Values[handleNumber];
            var increment = nearbySteps.thisStep.step;
            var decrement = null;
            // If snapped, directly use defined step value
            if (options.snap) {
                return [
                    value - nearbySteps.stepBefore.startValue || null,
                    nearbySteps.stepAfter.startValue - value || null,
                ];
            }
            // If the next value in this step moves into the next step,
            // the increment is the start of the next step - the current value
            if (increment !== false) {
                if (value + increment > nearbySteps.stepAfter.startValue) {
                    increment = nearbySteps.stepAfter.startValue - value;
                }
            }
            // If the value is beyond the starting point
            if (value > nearbySteps.thisStep.startValue) {
                decrement = nearbySteps.thisStep.step;
            }
            else if (nearbySteps.stepBefore.step === false) {
                decrement = false;
            }
            // If a handle is at the start of a step, it always steps back into the previous step first
            else {
                decrement = value - nearbySteps.stepBefore.highestStep;
            }
            // Now, if at the slider edges, there is no in/decrement
            if (location === 100) {
                increment = null;
            }
            else if (location === 0) {
                decrement = null;
            }
            // As per #391, the comparison for the decrement step can have some rounding issues.
            var stepDecimals = scope_Spectrum.countStepDecimals();
            // Round per #391
            if (increment !== null && increment !== false) {
                increment = Number(increment.toFixed(stepDecimals));
            }
            if (decrement !== null && decrement !== false) {
                decrement = Number(decrement.toFixed(stepDecimals));
            }
            return [decrement, increment];
        }
        // Get the current step size for the slider.
        function getNextSteps() {
            return scope_HandleNumbers.map(getNextStepsForHandle);
        }
        // Updatable: margin, limit, padding, step, range, animate, snap
        function updateOptions(optionsToUpdate, fireSetEvent) {
            // Spectrum is created using the range, snap, direction and step options.
            // 'snap' and 'step' can be updated.
            // If 'snap' and 'step' are not passed, they should remain unchanged.
            var v = valueGet();
            var updateAble = [
                "margin",
                "limit",
                "padding",
                "range",
                "animate",
                "snap",
                "step",
                "format",
                "pips",
                "tooltips",
            ];
            // Only change options that we're actually passed to update.
            updateAble.forEach(function (name) {
                // Check for undefined. null removes the value.
                if (optionsToUpdate[name] !== undefined) {
                    originalOptions[name] = optionsToUpdate[name];
                }
            });
            var newOptions = testOptions(originalOptions);
            // Load new options into the slider state
            updateAble.forEach(function (name) {
                if (optionsToUpdate[name] !== undefined) {
                    options[name] = newOptions[name];
                }
            });
            scope_Spectrum = newOptions.spectrum;
            // Limit, margin and padding depend on the spectrum but are stored outside of it. (#677)
            options.margin = newOptions.margin;
            options.limit = newOptions.limit;
            options.padding = newOptions.padding;
            // Update pips, removes existing.
            if (options.pips) {
                pips(options.pips);
            }
            else {
                removePips();
            }
            // Update tooltips, removes existing.
            if (options.tooltips) {
                tooltips();
            }
            else {
                removeTooltips();
            }
            // Invalidate the current positioning so valueSet forces an update.
            scope_Locations = [];
            valueSet(isSet(optionsToUpdate.start) ? optionsToUpdate.start : v, fireSetEvent);
        }
        // Initialization steps
        function setupSlider() {
            // Create the base element, initialize HTML and set classes.
            // Add handles and connect elements.
            scope_Base = addSlider(scope_Target);
            addElements(options.connect, scope_Base);
            // Attach user events.
            bindSliderEvents(options.events);
            // Use the public value method to set the start values.
            valueSet(options.start);
            if (options.pips) {
                pips(options.pips);
            }
            if (options.tooltips) {
                tooltips();
            }
            aria();
        }
        setupSlider();
        var scope_Self = {
            destroy: destroy,
            steps: getNextSteps,
            on: bindEvent,
            off: removeEvent,
            get: valueGet,
            set: valueSet,
            setHandle: valueSetHandle,
            reset: valueReset,
            // Exposed for unit testing, don't use this in your application.
            __moveHandles: function (upward, proposal, handleNumbers) {
                moveHandles(upward, proposal, scope_Locations, handleNumbers);
            },
            options: originalOptions,
            updateOptions: updateOptions,
            target: scope_Target,
            removePips: removePips,
            removeTooltips: removeTooltips,
            getPositions: function () {
                return scope_Locations.slice();
            },
            getTooltips: function () {
                return scope_Tooltips;
            },
            getOrigins: function () {
                return scope_Handles;
            },
            pips: pips, // Issue #594
        };
        return scope_Self;
    }
    // Run the standard initializer
    function initialize(target, originalOptions) {
        if (!target || !target.nodeName) {
            throw new Error("noUiSlider: create requires a single element, got: " + target);
        }
        // Throw an error if the slider was already initialized.
        if (target.noUiSlider) {
            throw new Error("noUiSlider: Slider was already initialized.");
        }
        // Test the options and create the slider environment;
        var options = testOptions(originalOptions);
        var api = scope(target, options, originalOptions);
        target.noUiSlider = api;
        return api;
    }
    var nouislider = {
        // Exposed for unit testing, don't use this in your application.
        __spectrum: Spectrum,
        // A reference to the default classes, allows global changes.
        // Use the cssClasses option for changes to one slider.
        cssClasses: cssClasses,
        create: initialize,
    };

    exports.create = initialize;
    exports.cssClasses = cssClasses;
    exports["default"] = nouislider;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
}(nouislider, nouislider.exports));

var noUiSlider = /*@__PURE__*/getDefaultExportFromCjs(nouislider.exports);

var {
  strings
} = window.theme;

var priceRange = container => {
  var inputs = t$6("input", container);
  var minInput = inputs[0];
  var maxInput = inputs[1];
  var events = [e$3(inputs, "change", onRangeChange)];
  var slider = n$3("[data-range-slider]", container);

  if (slider.noUiSlider) {
    slider.noUiSlider.destroy();
  }

  noUiSlider.create(slider, {
    start: [minInput.value ? minInput.value : minInput.getAttribute("min"), maxInput.value ? maxInput.value : maxInput.getAttribute("max")],
    handleAttributes: [{
      "aria-label": strings.accessibility.range_lower
    }, {
      "aria-label": strings.accessibility.range_upper
    }],
    connect: true,
    range: {
      "min": parseInt(minInput.getAttribute("min")),
      "max": parseInt(maxInput.getAttribute("max"))
    }
  });
  slider.noUiSlider.on("slide", e => {
    var max, min;
    [min, max] = e;
    minInput.value = Math.floor(min);
    maxInput.value = Math.floor(max);
    setMinAndMaxValues();
  });
  slider.noUiSlider.on("set", e => {
    var max, min;
    [min, max] = e;
    minInput.value = Math.floor(min);
    maxInput.value = Math.floor(max);
    fireChangeEvent();
    setMinAndMaxValues();
  });
  setMinAndMaxValues();

  function setMinAndMaxValues() {
    if (maxInput.value) minInput.setAttribute("max", maxInput.value);
    if (minInput.value) maxInput.setAttribute("min", minInput.value);
    if (minInput.value === "") maxInput.setAttribute("min", 0);
    if (maxInput.value === "") minInput.setAttribute("max", maxInput.getAttribute("max"));
  }

  function adjustToValidValues(input) {
    var value = Number(input.value);
    var min = Number(input.getAttribute("min"));
    var max = Number(input.getAttribute("max"));
    if (value < min) input.value = min;
    if (value > max) input.value = max;
  }

  function fireChangeEvent() {
    minInput.dispatchEvent(new Event("change", {
      bubbles: true
    }));
    maxInput.dispatchEvent(new Event("change", {
      bubbles: true
    }));
  }

  function onRangeChange(event) {
    adjustToValidValues(event.currentTarget);
    setMinAndMaxValues();
    if (minInput.value === "" && maxInput.value === "") return;
    var currentMax, currentMin;
    [currentMin, currentMax] = slider.noUiSlider.get();
    currentMin = Math.floor(currentMin);
    currentMax = Math.floor(currentMax);
    if (currentMin !== Math.floor(minInput.value)) slider.noUiSlider.set([minInput.value, null]);
    if (currentMax !== Math.floor(maxInput.value)) slider.noUiSlider.set([null, maxInput.value]);
  }

  function validateRange() {
    inputs.forEach(input => setMinAndMaxValues());
  }

  var reset = () => {
    slider.noUiSlider.set([minInput.getAttribute("min"), maxInput.getAttribute("max")]);
    minInput.value = "";
    maxInput.value = "";
    fireChangeEvent();
    setMinAndMaxValues();
  };

  var unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };

  return {
    unload,
    reset,
    validateRange
  };
};

var FILTERS_REMOVE = "collection:filters:remove";
var RANGE_REMOVE = "collection:range:remove";
var EVERYTHING_CLEAR = "collection:clear";
var FILTERS_UPDATE = "collection:filters:update"; // export const updateFilters = () => emit(FILTERS_UPDATE);

var updateFilters = target => r$1(FILTERS_UPDATE, null, {
  target
});
var clearAll = () => r$1(EVERYTHING_CLEAR);
var removeFilters = target => r$1(FILTERS_REMOVE, null, {
  target
});
var removeRange = () => r$1(RANGE_REMOVE);
var filtersUpdated = cb => c$1(FILTERS_UPDATE, cb);
var filtersRemoved = cb => c$1(FILTERS_REMOVE, cb);
var everythingCleared = cb => c$1(EVERYTHING_CLEAR, cb);
var rangeRemoved = cb => c$1(RANGE_REMOVE, cb);

var classes$2 = {
  active: "active",
  closed: "closed"
};
var ls = {
  getClosed: () => e("closed_sidebar_groups") || [],
  setClosed: val => r("closed_sidebar_groups", JSON.stringify(val))
};
var sel$2 = {
  heading: "[data-heading]",
  tag: "[data-tag]",
  filterItemLabel: "[data-filter-item-label]",
  sort: "[data-sort]",
  priceRange: "[data-price-range]",
  sidebarForm: "[data-filer-sidebar-form]",
  getGroup: group => "[data-group=\"".concat(group, "\"]")
};
var sidebar = (node => {
  if (!node) return Function();
  var sidebarForm = n$3(sel$2.sidebarForm, node);
  var click = e$3(node, "click", handleClick);
  var change = e$3(node, "change", handleChange);
  var range = null;
  var rangeContainer = n$3(sel$2.priceRange, sidebarForm);

  if (rangeContainer) {
    range = priceRange(rangeContainer);
  }

  var collectionUpdatedHanlder = c$1("collection:updated", collectionUpdated);

  function collectionUpdated(evt) {
    var updatedFilterItems = t$6("".concat(sel$2.sidebarForm, " ").concat(sel$2.filterItemLabel), evt.doc);
    updatedFilterItems.forEach(element => {
      updateInnerHTML("".concat(sel$2.sidebarForm, " ").concat(sel$2.filterItemLabel, "[for=\"").concat(element.getAttribute("for"), "\"]"), evt.doc);
    });
  }

  function updateInnerHTML(selector, doc) {
    var updatedItem = n$3(selector, doc);
    var oldItem = n$3(selector, sidebarForm);

    if (updatedItem && oldItem) {
      oldItem.innerHTML = updatedItem.innerHTML;
      oldItem.className = updatedItem.className;
    }
  }

  function handleChange(evt) {
    var {
      sort,
      filter,
      rangeInput
    } = evt.target.dataset;

    if (rangeInput || sort || filter) {
      updateFilters(sidebarForm);
    }
  }

  function handleClick(evt) {
    // evt.preventDefault();
    var {
      heading
    } = evt.target.dataset;

    if (heading) {
      evt.preventDefault();
      var {
        nextElementSibling: content
      } = evt.target;
      slideStop(content);
      var current = ls.getClosed();

      if (isVisible(content)) {
        u$2(evt.target, classes$2.closed);
        slideUp(content);
        ls.setClosed([...current, heading]);
      } else {
        i$1(evt.target, classes$2.closed);
        var slideOptions = {
          display: "block"
        };

        if (content.classList.contains("filter-drawer__list--swatch") || content.classList.contains("filter-drawer__list--chip")) {
          slideOptions.display = "flex";
        }

        slideDown(content, slideOptions);
        ls.setClosed(current.filter(item => item !== heading));
      }
    }
  }

  function unload() {
    click();
    change();
    range && range.unload();
    collectionUpdatedHanlder();
  }

  return () => {
    unload();
  };
});

var sel$1 = {
  filter: "[data-filter-open]",
  flyouts: "[data-filter-flyout]",
  button: "[data-button]",
  wash: "[data-filter-wash]",
  tag: "[data-tag]",
  sort: "[data-sort]",
  close: "[data-close-icon]",
  form: "[data-filter-form-flyout]",
  priceRange: "[data-price-range]"
};
var selectors$4 = {
  active: "active",
  checked: ":checked"
};
var flyout = (node => {
  var flyoutForm = n$3(sel$1.form, node);
  if (!flyoutForm) return Function();
  var wash = n$3(sel$1.wash, node);
  var focusTrap = null;
  var range = null;
  var rangeContainer = n$3(sel$1.priceRange, flyoutForm);

  if (rangeContainer) {
    range = priceRange(rangeContainer);
  }

  animateFilterFlyout(node);
  var delegate = new Delegate(node);
  delegate.on("click", sel$1.wash, clickWash);
  delegate.on("click", sel$1.button, clickButton);
  delegate.on("click", sel$1.close, clickWash);
  var events = [e$3(t$6(sel$1.filter, node), "click", clickFlyoutTrigger), e$3(node, "keydown", _ref => {
    var {
      keyCode
    } = _ref;
    if (keyCode === 27) clickWash();
  })];
  var collectionUpdatedHanlder = c$1("collection:updated", collectionUpdated);

  function collectionUpdated(evt) {
    range && range.unload();
    rangeContainer = n$3(sel$1.priceRange, flyoutForm);

    if (rangeContainer) {
      range = priceRange(rangeContainer);
    }
  }

  function clickFlyoutTrigger(e) {
    e.preventDefault();
    var drawer = n$3("#".concat(e.currentTarget.getAttribute("aria-controls")));

    if (drawer) {
      var close = n$3(sel$1.close, drawer);
      close.setAttribute("aria-expanded", true);
      e.currentTarget.setAttribute("aria-expanded", true);
      u$2(wash, selectors$4.active);
      u$2(drawer, selectors$4.active);
      focusTrap = createFocusTrap(drawer, {
        allowOutsideClick: true
      });
      focusTrap.activate();
      disableBodyScroll(node, {
        hideBodyOverflow: true,
        allowTouchMove: el => {
          while (el && el !== document.body && el.id !== "main-content") {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }

            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
    }
  }

  function clickWash(e) {
    e && e.preventDefault();
    focusTrap && focusTrap.deactivate();
    var flyouts = t$6(sel$1.flyouts, node);
    i$1([...flyouts, wash], selectors$4.active);
    setTimeout(() => {
      enableBodyScroll(node);
    }, 300);
    flyouts.forEach(flyout => {
      var flyoutControls = t$6("[aria-controls=\"".concat(flyout.id, "\"]"));
      flyoutControls.forEach(control => {
        control.setAttribute("aria-expanded", false);
      });
    });
  }

  function clickButton(e) {
    e.preventDefault();
    var {
      button
    } = e.target.dataset;
    var scope = e.target.closest(sel$1.flyouts);

    if (button === "clear") {
      var inputs = t$6("[data-filter-item]", scope);
      inputs.forEach(input => {
        if (input.type === "checkbox" || input.type === "radio") {
          input.checked = false;
        } else {
          input.value = "";
        }
      });
      removeRange();
    } else if (button === "apply") {
      updateFilters(flyoutForm);
      clickWash();
    }
  }

  function removeRange() {
    range && range.reset();
  }

  return () => {
    events.forEach(unsubscribe => unsubscribe());
    range && range.unload();
    delegate.off();
    collectionUpdatedHanlder();
  };
});

var filtering = container => {
  var forms = t$6("[data-filter-form]", container);
  var formData, searchParams;
  setParams();

  function setParams(form) {
    form = form || forms[0];
    formData = new FormData(form);
    searchParams = new URLSearchParams(formData).toString();
  }
  /**
   * Takes the updated form element and updates all other forms with the updated values
   * @param {*} target
   */


  function syncForms(target) {
    if (!target) return;
    var targetInputs = t$6("[data-filter-item]", target);
    targetInputs.forEach(targetInput => {
      if (targetInput.type === "checkbox" || targetInput.type === "radio") {
        var {
          valueEscaped
        } = targetInput.dataset;
        var items = t$6("input[name='".concat(targetInput.name, "'][data-value-escaped='").concat(valueEscaped, "']"));
        items.forEach(input => {
          input.checked = targetInput.checked;
        });
      } else {
        var _items = t$6("input[name='".concat(targetInput.name, "']"));

        _items.forEach(input => {
          input.value = targetInput.value;
        });
      }
    });
  }
  /**
   * When filters are removed, set the checked attribute to false
   * for all filter inputs for that filter.
   * Can accept multiple filters
   * @param {Array} targets Array of inputs
   */


  function uncheckFilters(targets) {
    if (!targets) return;
    var selector;
    targets.forEach(target => {
      selector = !selector ? "" : ", ".concat(selector);
      var {
        name,
        valueEscaped
      } = target.dataset;
      selector = "input[name='".concat(name, "'][data-value-escaped='").concat(valueEscaped, "']").concat(selector);
    });
    var inputs = t$6(selector, container);
    inputs.forEach(input => {
      input.checked = false;
    });
  }

  function clearRangeInputs() {
    var rangeInputs = t$6("[data-range-input]", container);
    rangeInputs.forEach(input => {
      input.value = "";
    });
  }

  function resetForms() {
    forms.forEach(form => {
      form.reset();
    });
  }

  return {
    getState() {
      return {
        url: searchParams
      };
    },

    filtersUpdated(target, cb) {
      syncForms(target);
      setParams(target);
      return cb(this.getState());
    },

    removeFilters(target, cb) {
      uncheckFilters(target);
      setParams();
      return cb(this.getState());
    },

    removeRange(cb) {
      clearRangeInputs();
      setParams();
      return cb(this.getState());
    },

    clearAll(cb) {
      searchParams = "";
      resetForms();
      return cb(this.getState());
    },

    unload() {}

  };
};

var selectors$3 = {
  infiniteScrollContainer: ".collection__infinite-container",
  infiniteScrollTrigger: ".collection__infinite-trigger",
  sidebar: "[data-sidebar]",
  partial: "[data-partial]",
  sort: "[data-sort]",
  filterFlyoutForm: "[data-filter-form-flyout]"
};
var classes$1 = {
  active: "is-active",
  hideProducts: "animation--collection-products-hide"
};
register("collection", {
  infiniteScroll: null,

  onLoad() {
    var {
      collectionItemCount,
      paginationType
    } = this.container.dataset;
    if (!parseInt(collectionItemCount)) return;
    this.paginationType = paginationType;
    this.paginated = this.paginationType === "paginated";
    this.infiniteScrollTrigger = n$3(selectors$3.infiniteScrollTrigger, this.container);
    this.collection = Collection(window.location.href);
    this.sidebar = sidebar(n$3(selectors$3.sidebar, this.container));
    this.flyout = flyout(this.container);
    this.filterForm = n$3("[data-filter-form]", this.container);

    if (this.filterForm) {
      this._initFiltering();
    } // Set initial evx state from collection url object


    o(this.collection.getState());
    this.partial = n$3(selectors$3.partial, this.container);

    this._initInfiniteScroll();

    this.collectionUpdatedHandler = c$1("collection:updated", () => {
      var _this$animateCollecti;

      (_this$animateCollecti = this.animateCollection) === null || _this$animateCollecti === void 0 ? void 0 : _this$animateCollecti.infiniteScrollReveal();
    });
    this.animateCollection = animateCollection(this.container);
  },

  _initFiltering() {
    // collection filters
    this.filtering = filtering(this.container); // Set initial evx state from collection url object

    o(this.filtering.getState());
    this.partial = n$3(selectors$3.partial, this.container);
    this.subscriptions = [filtersRemoved((_, _ref) => {
      var {
        target
      } = _ref;
      this.filtering.removeFilters(target, data => {
        this._renderView(data.url);

        o(data)();
      });
    }), rangeRemoved(() => {
      this.filtering.removeRange(data => {
        this._renderView(data.url);

        o(data)();
      });
    }), filtersUpdated((_, _ref2) => {
      var {
        target
      } = _ref2;
      this.filtering.filtersUpdated(target, data => {
        this._renderView(data.url);

        o(data)();
      });
    }), everythingCleared(() => {
      this.filtering.clearAll(data => {
        this._renderView(data.url);

        o(data)();
      });
    })];
    this.delegate = new Delegate(this.partial);
    this.delegate.on("click", "[data-remove-filter]", e => {
      e.preventDefault();
      removeFilters([e.target]);
    });
    this.delegate.on("click", "[data-remove-range]", e => {
      e.preventDefault();
      removeRange();
    });
    this.delegate.on("click", "[data-clear]", e => {
      e.preventDefault();
      clearAll();
    });
  },

  _initInfiniteScroll() {
    if (this.paginated) return;
    var infiniteScrollOptions = {
      container: selectors$3.infiniteScrollContainer,
      pagination: selectors$3.infiniteScrollTrigger,
      loadingText: "Loading...",
      callback: () => r$1("collection:updated")
    };

    if (this.paginationType === "click") {
      infiniteScrollOptions.method = "click";
    }

    AjaxinateShim(Ajaxinate);
    this.infiniteScroll = new Ajaxinate(infiniteScrollOptions);
  },

  _renderView(searchParams) {
    var url = "".concat(window.location.pathname, "?section_id=").concat(this.container.dataset.sectionId, "&").concat(searchParams);
    var loading = n$3(".collection__loading", this.container);
    u$2(this.partial, classes$1.hideProducts);
    u$2(loading, classes$1.active);
    fetch(url, {
      credentials: "include"
    }).then(res => res.text()).then(res => {
      var _this$animateCollecti2;

      this._updateURLHash(searchParams);

      var doc = new window.DOMParser().parseFromString(res, "text/html");
      var contents = n$3(selectors$3.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      (_this$animateCollecti2 = this.animateCollection) === null || _this$animateCollecti2 === void 0 ? void 0 : _this$animateCollecti2.updateContents();
      var filterFlyoutForm = n$3(selectors$3.filterFlyoutForm, doc).innerHTML;
      n$3(selectors$3.filterFlyoutForm, this.container).innerHTML = filterFlyoutForm;

      if (!this.paginated) {
        this.infiniteScrollTrigger.innerHTML = "";

        this._initInfiniteScroll();
      }

      i$1(loading, "is-active");
      r$1("collection:updated", {
        doc: doc
      });
    });
  },

  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", "".concat(window.location.pathname).concat(searchParams && "?".concat(searchParams)));
  },

  onUnload() {
    var _this$animateCollecti3;

    this.infiniteScroll && this.infiniteScroll.destroy();
    this.sidebar && this.sidebar();
    this.flyout && this.flyout();
    this.filtering && this.filtering.unload();
    this.delegate && this.delegate.off();
    this.subscriptions && this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.collectionUpdatedHandler && this.collectionUpdatedHandler();
    (_this$animateCollecti3 = this.animateCollection) === null || _this$animateCollecti3 === void 0 ? void 0 : _this$animateCollecti3.destroy();
  }

});

var selectors$2 = {
  partial: "[data-partial]",
  sort: "[data-sort]"
};
var classes = {
  active: "is-active",
  hideItems: "animation--search-items-hide"
};
register("search", {
  onLoad() {
    var {
      searchItemCount
    } = this.container.dataset;
    this.animateSearch = animateSearch(this.container);
    if (!parseInt(searchItemCount)) return;
    this.partial = n$3(selectors$2.partial, this.container);
    this.flyout = flyout(this.container);
    this.filterForm = n$3("[data-filter-form]", this.container);

    if (this.filterForm) {
      this._initFiltering();
    }
  },

  _initFiltering() {
    // search filters
    this.filtering = filtering(this.container);
    this.partial = n$3(selectors$2.partial, this.container);
    this.subscriptions = [filtersRemoved((_, _ref) => {
      var {
        target
      } = _ref;
      this.filtering.removeFilters(target, data => {
        this._renderView(data.url);
      });
    }), rangeRemoved(() => {
      this.filtering.removeRange(data => {
        this._renderView(data.url);
      });
    }), filtersUpdated((_, _ref2) => {
      var {
        target
      } = _ref2;
      this.filtering.filtersUpdated(target, data => {
        this._renderView(data.url);
      });
    }), everythingCleared(() => {
      this.filtering.clearAll(data => {
        this._renderView(data.url);
      });
    })];
    this.delegate = new Delegate(this.partial);
    this.delegate.on("click", "[data-remove-filter]", e => {
      e.preventDefault();
      removeFilters([e.target]);
    });
    this.delegate.on("click", "[data-remove-range]", e => {
      e.preventDefault();
      removeRange();
    });
    this.delegate.on("click", "[data-clear]", e => {
      e.preventDefault();
      clearAll();
    });
  },

  _renderView(searchParams) {
    var url = "".concat(window.location.pathname, "?section_id=").concat(this.container.dataset.sectionId, "&").concat(searchParams);
    var loading = n$3(".search-template__loading", this.container);
    u$2(this.partial, classes.hideItems);
    u$2(loading, classes.active);
    fetch(url, {
      credentials: "include"
    }).then(res => res.text()).then(res => {
      var _this$animateSearch;

      this._updateURLHash(searchParams);

      var doc = new window.DOMParser().parseFromString(res, "text/html");
      var contents = n$3(selectors$2.partial, doc).innerHTML;
      this.partial.innerHTML = contents;
      (_this$animateSearch = this.animateSearch) === null || _this$animateSearch === void 0 ? void 0 : _this$animateSearch.updateContents();
      i$1(loading, "is-active");
      r$1("collection:updated");
    });
  },

  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", "".concat(window.location.pathname).concat(searchParams && "?".concat(searchParams)));
  },

  onUnload() {
    var _this$animateSearch2;

    this.flyout();
    this.filtering();
    this.delegate.off();
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    (_this$animateSearch2 = this.animateSearch) === null || _this$animateSearch2 === void 0 ? void 0 : _this$animateSearch2.destroy();
  }

});

var selectors$1 = {
  recoverPasswordLink: "#RecoverPassword",
  recoverPasswordForm: "#RecoverPasswordForm",
  hideRecoverPasswordLink: "#HideRecoverPasswordLink",
  customerLoginForm: "#CustomerLoginForm",
  resetFormState: ".reset-password-success",
  resetFormMessage: "#ResetSuccess"
};
register("login", {
  onLoad() {
    this.recoverPasswordLink = this.container.querySelector(selectors$1.recoverPasswordLink);
    this.hideRecoverPasswordLink = this.container.querySelector(selectors$1.hideRecoverPasswordLink);
    this.customerLoginForm = this.container.querySelector(selectors$1.customerLoginForm);
    this._onShowHidePasswordForm = this._onShowHidePasswordForm.bind(this);

    if (this.recoverPasswordLink) {
      this._checkUrlHash();

      this._resetPasswordSuccess();

      this.recoverPasswordLink.addEventListener("click", this._onShowHidePasswordForm);
      this.hideRecoverPasswordLink.addEventListener("click", this._onShowHidePasswordForm);
    }
  },

  _onShowHidePasswordForm(evt) {
    evt.preventDefault();

    this._toggleRecoverPasswordForm();
  },

  _checkUrlHash() {
    var hash = window.location.hash; // Allow deep linking to recover password form

    if (hash === "#recover") {
      this._toggleRecoverPasswordForm();
    }
  },

  /**
   *  Show/Hide recover password form
   */
  _toggleRecoverPasswordForm() {
    var recoverPasswordForm = this.container.querySelector(selectors$1.recoverPasswordForm);
    recoverPasswordForm.classList.toggle("hide");
    this.customerLoginForm.classList.toggle("hide");
  },

  /**
   *  Show reset password success message
   */
  _resetPasswordSuccess() {
    var formState = this.container.querySelector(selectors$1.resetFormState);
    var formMessage = this.container.querySelector(selectors$1.resetFormMessage); // check if reset password form was successfully submited.

    if (!formState) {
      return;
    } // show success message


    formMessage.classList.remove("hide");
  },

  onUnload() {}

});

/**
 * CountryProvinceSelector Constructor
 * @param {String} countryOptions the country options in html string
 */
function CountryProvinceSelector(countryOptions) {
  if (typeof countryOptions !== 'string') {
    throw new TypeError(countryOptions + ' is not a string.');
  }
  this.countryOptions = countryOptions;
}

/**
 * Builds the country and province selector with the given node element
 * @param {Node} countryNodeElement The <select> element for country
 * @param {Node} provinceNodeElement The <select> element for province
 * @param {Object} options Additional settings available
 * @param {CountryProvinceSelector~onCountryChange} options.onCountryChange callback after a country `change` event
 * @param {CountryProvinceSelector~onProvinceChange} options.onProvinceChange callback after a province `change` event
 */
CountryProvinceSelector.prototype.build = function (countryNodeElement, provinceNodeElement, options) {
  if (typeof countryNodeElement !== 'object') {
    throw new TypeError(countryNodeElement + ' is not a object.');
  }

  if (typeof provinceNodeElement !== 'object') {
    throw new TypeError(provinceNodeElement + ' is not a object.');
  }

  var defaultValue = countryNodeElement.getAttribute('data-default');
  options = options || {};

  countryNodeElement.innerHTML = this.countryOptions;
  countryNodeElement.value = defaultValue;

  if (defaultValue && getOption(countryNodeElement, defaultValue)) {
    var provinces = buildProvince(countryNodeElement, provinceNodeElement, defaultValue);
    options.onCountryChange && options.onCountryChange(provinces, provinceNodeElement, countryNodeElement);
  }

  // Listen for value change on the country select
  countryNodeElement.addEventListener('change', function (event) {
    var target = event.target;
    var selectedValue = target.value;
    
    var provinces = buildProvince(target, provinceNodeElement, selectedValue);
    options.onCountryChange && options.onCountryChange(provinces, provinceNodeElement, countryNodeElement);
  });

  options.onProvinceChange && provinceNodeElement.addEventListener('change', options.onProvinceChange);
};

/**
 * This callback is called after a user interacted with a country `<select>`
 * @callback CountryProvinceSelector~onCountryChange
 * @param {array} provinces the parsed provinces
 * @param {Node} provinceNodeElement province `<select>` element
 * @param {Node} countryNodeElement country `<select>` element
 */

 /**
 * This callback is called after a user interacted with a province `<select>`
 * @callback CountryProvinceSelector~onProvinceChange
 * @param {Event} event the province selector `change` event object
 */

/**
 * Returns the <option> with the specified value from the
 * given node element
 * A null is returned if no such <option> is found
 */
function getOption(nodeElement, value) {
  return nodeElement.querySelector('option[value="' + value +'"]')
}

/**
 * Builds the options for province selector
 */
function buildOptions (provinceNodeElement, provinces) {
  var defaultValue = provinceNodeElement.getAttribute('data-default');

  provinces.forEach(function (option) {
    var optionElement = document.createElement('option');
    optionElement.value = option[0];
    optionElement.textContent = option[1];

    provinceNodeElement.appendChild(optionElement);
  });

  if (defaultValue && getOption(provinceNodeElement, defaultValue)) {
    provinceNodeElement.value = defaultValue;
  }
}

/**
 * Builds the province selector
 */
function buildProvince (countryNodeElement, provinceNodeElement, selectedValue) {
  var selectedOption = getOption(countryNodeElement, selectedValue);
  var provinces = JSON.parse(selectedOption.getAttribute('data-provinces'));

  provinceNodeElement.options.length = 0;

  if (provinces.length) {
    buildOptions(provinceNodeElement, provinces);
  }

  return provinces;
}

/**
 * Customer Addresses Script
 * ------------------------------------------------------------------------------
 * A file that contains scripts highly couple code to the Customer Addresses
 * template.
 *
 * @namespace customerAddresses
 */
var selectors = {
  addressContainer: "[data-address]",
  addressToggle: "[data-address-toggle]",
  addressCountry: "[data-address-country]",
  addressProvince: "[data-address-province]",
  addressProvinceWrapper: "[data-address-province-wrapper]",
  addressForm: "[data-address-form]",
  addressDeleteForm: "[data-address-delete-form]"
};
var hideClass = "hide";
register("addresses", {
  onLoad() {
    var addresses = this.container.querySelectorAll(selectors.addressContainer);

    if (addresses.length) {
      var countryProvinceSelector = new CountryProvinceSelector(window.theme.allCountryOptionTags);
      addresses.forEach(addressContainer => {
        this._initializeAddressForm(countryProvinceSelector, addressContainer);
      });
    }
  },

  _initializeAddressForm(countryProvinceSelector, container) {
    var countrySelector = container.querySelector(selectors.addressCountry);
    var provinceSelector = container.querySelector(selectors.addressProvince);
    var provinceWrapper = container.querySelector(selectors.addressProvinceWrapper);
    var addressForm = container.querySelector(selectors.addressForm);
    var deleteForm = container.querySelector(selectors.addressDeleteForm);
    var formToggles = container.querySelectorAll(selectors.addressToggle);
    countryProvinceSelector.build(countrySelector, provinceSelector, {
      onCountryChange: provinces => provinceWrapper.classList.toggle(hideClass, !provinces.length)
    });
    formToggles.forEach(button => {
      button.addEventListener("click", () => {
        addressForm.classList.toggle(hideClass);
        formToggles.forEach(innerButton => {
          innerButton.setAttribute("aria-expanded", innerButton.getAttribute("aria-expanded") === "true" ? false : true);
        });
      });
    });

    if (deleteForm) {
      deleteForm.addEventListener("submit", event => {
        var confirmMessage = deleteForm.getAttribute("data-confirm-message");

        if (!window.confirm(confirmMessage || "Are you sure you wish to delete this address?")) {
          event.preventDefault();
        }
      });
    }
  },

  onUnload() {}

});

register("page", {
  onLoad() {
    this.animatePage = animatePage(this.container);
  },

  onUnload() {
    var _this$animatePage;

    (_this$animatePage = this.animatePage) === null || _this$animatePage === void 0 ? void 0 : _this$animatePage.destroy();
  }

});

var sel = {
  toggle: "[data-js-toggle]"
};
register("password", {
  onLoad() {
    this.toggleButton = this.container.querySelector(sel.toggle);
    this.toggleButton.addEventListener("click", e => this.toggleView(e));
    var passwordInput = this.container.querySelector("[data-storefront-password-input]");

    if (passwordInput) {
      if (passwordInput.className.indexOf("storefront-password-error") >= 0) {
        this.toggleView();
      }
    }

    this.animatePassword = animatePassword(this.container);
  },

  onUnload() {
    this.toggleButton.removeEventListener("click", e => this.toggleView(e));
  },

  toggleView(e) {
    var _this$animatePassword;

    e && e.preventDefault();
    this.container.classList.toggle("welcome");
    (_this$animatePassword = this.animatePassword) === null || _this$animatePassword === void 0 ? void 0 : _this$animatePassword.destroy();
  }

});

register("blog", {
  onLoad() {
    this.animateBlog = animateBlog(this.container);
  },

  onUnload() {
    var _this$animateBlog;

    (_this$animateBlog = this.animateBlog) === null || _this$animateBlog === void 0 ? void 0 : _this$animateBlog.destroy();
  }

});

register("list-collections", {
  onLoad() {
    this.animateListCollections = animateListCollections(this.container);
  },

  onUnload() {
    var _this$animateListColl;

    (_this$animateListColl = this.animateListCollections) === null || _this$animateListColl === void 0 ? void 0 : _this$animateListColl.destroy();
  }

});

document.addEventListener("DOMContentLoaded", () => {
  load("*"); // Get cart state before initializing quick cart

  fetchCart().then(cart => {
    o({
      cart
    }); // Setup cart drawer

    var cartDrawerElement = document.querySelector("[data-cart-drawer]");
    cartDrawer(cartDrawerElement);
  });
}); // Make it easy to see exactly what theme version
// this is by commit SHA
// window.SHA = SHA;
// Detect theme editor

if (Shopify.designMode === true) {
  document.documentElement.classList.add("theme-editor");
} else {
  var el = document.querySelector(".theme-editor-scroll-offset");
  el && el.remove();
} // Handle all accordion shortcodes


var accordions = document.querySelectorAll(".accordion");

if (accordions.length) {
  accordions.forEach(item => {
    accordion(item);
  });
} // Setup sticky header


var headerWrapper = document.querySelector(".header-container");
stickyHeader(headerWrapper); // Setup header overlay

var headerOverlayContainer = document.querySelector("[data-header-overlay]");
headerOverlay(headerOverlayContainer); // Setup drawer overlay

var drawerOverlayContainer = document.querySelector("[data-drawer-overlay]");
drawerOverlay(drawerOverlayContainer); // Setup modal

var modalElement = document.querySelector("[data-modal]");
modal(modalElement); // Quick add to cart

quickAdd(); // Prdocut availabilty drawer

var availabilityDrawer = document.querySelector("[data-store-availability-drawer]");
storeAvailabilityDrawer(availabilityDrawer); // Determine if the user is a mouse or keyboard user

function handleFirstTab(e) {
  if (e.keyCode === 9) {
    document.body.classList.add("user-is-tabbing");
    window.removeEventListener("keydown", handleFirstTab);
    window.addEventListener("mousedown", handleMouseDownOnce);
  }
}

function handleMouseDownOnce() {
  document.body.classList.remove("user-is-tabbing");
  window.removeEventListener("mousedown", handleMouseDownOnce);
  window.addEventListener("keydown", handleFirstTab);
}

window.addEventListener("keydown", handleFirstTab); // Disable auto zoom on input field for ios devices.
// https://stackoverflow.com/a/57527009

var addMaximumScaleToMetaViewport = () => {
  var el = document.querySelector("meta[name=viewport]");

  if (el !== null) {
    var content = el.getAttribute("content");
    var re = /maximum\-scale=[0-9\.]+/g;

    if (re.test(content)) {
      content = content.replace(re, "maximum-scale=1.0");
    } else {
      content = [content, "maximum-scale=1.0"].join(", ");
    }

    el.setAttribute("content", content);
  }
};

var disableIosTextFieldZoom = addMaximumScaleToMetaViewport; // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios/9039885#9039885

var checkIsIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

if (checkIsIOS()) {
  disableIosTextFieldZoom();
} // Wrap all tables


var tables = document.querySelectorAll("table");
tables.forEach(el => {
  var wrapper = document.createElement("div");
  wrapper.classList.add("rte-table");
  wrapper.tabIndex = 0;
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
}); // Focus errors

var errorEl = document.querySelector(".form-status__message--error");

if (errorEl) {
  errorEl.focus();
  document.title = "Error - " + document.title;
} // Make it easy to see exactly what theme version
// this is by commit SHA


window.SHA = "5a381c1e1c";
