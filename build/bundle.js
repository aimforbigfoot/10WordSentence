
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Header\Header.svelte generated by Svelte v3.31.1 */

    const file = "src\\Header\\Header.svelte";

    function create_fragment(ctx) {
    	let header;
    	let h1;

    	const block = {
    		c: function create() {
    			header = element("header");
    			h1 = element("h1");
    			h1.textContent = "10WordSentence";
    			add_location(h1, file, 12, 4, 80);
    			attr_dev(header, "class", "svelte-9ba3d7");
    			add_location(header, file, 9, 0, 62);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Header", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\Body\Sentence.svelte generated by Svelte v3.31.1 */

    const { console: console_1 } = globals;
    const file$1 = "src\\Body\\Sentence.svelte";

    // (136:26) 
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "new paragraph detected";
    			attr_dev(p, "class", "svelte-132q540");
    			add_location(p, file$1, 136, 4, 3169);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(136:26) ",
    		ctx
    	});

    	return block;
    }

    // (128:4) {#if name != " "}
    function create_if_block(ctx) {
    	let p0;
    	let t1;
    	let div;
    	let textarea;
    	let textarea_class_value;
    	let t2;
    	let p1;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = `${/*nameOrg*/ ctx[3]}`;
    			t1 = space();
    			div = element("div");
    			textarea = element("textarea");
    			t2 = space();
    			p1 = element("p");
    			t3 = text(/*info*/ ctx[2]);
    			attr_dev(p0, "class", "orginalName svelte-132q540");
    			add_location(p0, file$1, 128, 4, 2884);
    			attr_dev(textarea, "contenteditable", "");
    			attr_dev(textarea, "class", textarea_class_value = "" + (null_to_empty(/*col*/ ctx[1]) + " svelte-132q540"));
    			attr_dev(textarea, "rows", "1");
    			attr_dev(textarea, "cols", "110");
    			add_location(textarea, file$1, 130, 8, 2965);
    			attr_dev(p1, "class", "wordsCount svelte-132q540");
    			add_location(p1, file$1, 131, 8, 3079);
    			attr_dev(div, "class", "input-and-info  svelte-132q540");
    			add_location(div, file$1, 129, 4, 2926);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, textarea);
    			set_input_value(textarea, /*name*/ ctx[0]);
    			append_dev(div, t2);
    			append_dev(div, p1);
    			append_dev(p1, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[8]),
    					listen_dev(textarea, "keyup", /*keyPress*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*col*/ 2 && textarea_class_value !== (textarea_class_value = "" + (null_to_empty(/*col*/ ctx[1]) + " svelte-132q540"))) {
    				attr_dev(textarea, "class", textarea_class_value);
    			}

    			if (dirty & /*name*/ 1) {
    				set_input_value(textarea, /*name*/ ctx[0]);
    			}

    			if (dirty & /*info*/ 4) set_data_dev(t3, /*info*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(128:4) {#if name != \\\" \\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*name*/ ctx[0] != " ") return create_if_block;
    		if (/*name*/ ctx[0] == " ") return create_if_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "sen svelte-132q540");
    			add_location(div, file$1, 126, 0, 2791);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "mouseleave", /*mouseGone*/ ctx[6], false, false, false),
    					listen_dev(div, "mouseover", /*mosey*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function delBtn() {
    	console.log(self);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Sentence", slots, []);
    	let { name = "" } = $$props;
    	let { val = "" } = $$props;
    	let mouseIn = "btn-none";
    	let nameOrg = name;
    	let col = "";
    	const colorNames = ["green", "yellow", "red"];
    	let info = "";

    	function keyPress() {
    		let count = 0;

    		// console.log(name)
    		if (name) {
    			count = 1;
    		}

    		for (let i = 0; i < name.length; i++) {
    			if (name[i] == " " && name[i + 1] !== " ") {
    				count++;
    			}
    		}

    		if (name[name.length] == " ") {
    			count--;
    		}

    		if (count <= 10) {
    			$$invalidate(1, col = colorNames[0]);
    		} else if (count > 10 && count <= 15) {
    			$$invalidate(1, col = colorNames[1]);
    		} else {
    			$$invalidate(1, col = colorNames[2]);
    		}

    		let c = count;
    		$$invalidate(2, info = "Words: " + c.toString());

    		// console.log(col)
    		$$invalidate(7, val = name);
    	}

    	keyPress();

    	function mosey() {
    		// console.log("mouseOver")
    		mouseIn = "btn-block";
    	}

    	function mouseGone() {
    		mouseIn = "btn-none";
    	}

    	function addBtn() {
    		console.log(self);
    		$$invalidate(7, val += ["\n"]);
    	}

    	const writable_props = ["name", "val"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Sentence> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("val" in $$props) $$invalidate(7, val = $$props.val);
    	};

    	$$self.$capture_state = () => ({
    		name,
    		val,
    		mouseIn,
    		nameOrg,
    		col,
    		colorNames,
    		info,
    		keyPress,
    		mosey,
    		mouseGone,
    		delBtn,
    		addBtn
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("val" in $$props) $$invalidate(7, val = $$props.val);
    		if ("mouseIn" in $$props) mouseIn = $$props.mouseIn;
    		if ("nameOrg" in $$props) $$invalidate(3, nameOrg = $$props.nameOrg);
    		if ("col" in $$props) $$invalidate(1, col = $$props.col);
    		if ("info" in $$props) $$invalidate(2, info = $$props.info);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		name,
    		col,
    		info,
    		nameOrg,
    		keyPress,
    		mosey,
    		mouseGone,
    		val,
    		textarea_input_handler
    	];
    }

    class Sentence extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { name: 0, val: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sentence",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get name() {
    		throw new Error("<Sentence>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Sentence>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get val() {
    		throw new Error("<Sentence>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set val(value) {
    		throw new Error("<Sentence>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Body\Body.svelte generated by Svelte v3.31.1 */

    const { console: console_1$1 } = globals;
    const file$2 = "src\\Body\\Body.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[17] = list;
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (152:4) {:else}
    function create_else_block(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Click To Submit";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Try a Lorem Ipsum Text";
    			attr_dev(button0, "class", "svelte-pn327b");
    			add_location(button0, file$2, 152, 8, 5050);
    			attr_dev(button1, "class", "svelte-pn327b");
    			add_location(button1, file$2, 153, 8, 5118);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*handleSubClick*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*loremIpsum*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(152:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (149:4) {#if clicked}
    function create_if_block$1(ctx) {
    	let button;
    	let t1;
    	let p;
    	let t2;
    	let br;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Analyze New Text";
    			t1 = space();
    			p = element("p");
    			t2 = text("^^ These buttons have been removed ^^");
    			br = element("br");
    			t3 = text("Reload the page to analyze a new text");
    			attr_dev(button, "class", "svelte-pn327b");
    			add_location(button, file$2, 149, 8, 4850);
    			attr_dev(br, "class", "svelte-pn327b");
    			add_location(br, file$2, 150, 49, 4982);
    			attr_dev(p, "class", "svelte-pn327b");
    			add_location(p, file$2, 150, 8, 4941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    			append_dev(p, br);
    			append_dev(p, t3);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(149:4) {#if clicked}",
    		ctx
    	});

    	return block;
    }

    // (165:4) {#each objArr as obj, i}
    function create_each_block(ctx) {
    	let sentence;
    	let updating_val;
    	let current;

    	function sentence_val_binding(value) {
    		/*sentence_val_binding*/ ctx[11].call(null, value, /*i*/ ctx[18]);
    	}

    	let sentence_props = { name: /*obj*/ ctx[16].name };

    	if (/*arrOfSen*/ ctx[3][/*i*/ ctx[18]] !== void 0) {
    		sentence_props.val = /*arrOfSen*/ ctx[3][/*i*/ ctx[18]];
    	}

    	sentence = new Sentence({ props: sentence_props, $$inline: true });
    	binding_callbacks.push(() => bind(sentence, "val", sentence_val_binding));

    	const block = {
    		c: function create() {
    			create_component(sentence.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sentence, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const sentence_changes = {};
    			if (dirty & /*objArr*/ 16) sentence_changes.name = /*obj*/ ctx[16].name;

    			if (!updating_val && dirty & /*arrOfSen*/ 8) {
    				updating_val = true;
    				sentence_changes.val = /*arrOfSen*/ ctx[3][/*i*/ ctx[18]];
    				add_flush_callback(() => updating_val = false);
    			}

    			sentence.$set(sentence_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sentence.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sentence.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sentence, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(165:4) {#each objArr as obj, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let main;
    	let h3;
    	let t1;
    	let textarea;
    	let t2;
    	let br0;
    	let t3;
    	let t4;
    	let div;
    	let p0;
    	let t6;
    	let p1;
    	let t8;
    	let p2;
    	let t10;
    	let br1;
    	let t11;
    	let p3;
    	let t12;
    	let t13;
    	let t14;
    	let p4;
    	let t15;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*clicked*/ ctx[5]) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = /*objArr*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h3 = element("h3");
    			h3.textContent = "Type in any text you want to analyze";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			if_block.c();
    			t4 = space();
    			div = element("div");
    			p0 = element("p");
    			p0.textContent = "Red is a long sentence";
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "Yellow is a bit too long of a sentence";
    			t8 = space();
    			p2 = element("p");
    			p2.textContent = "Green is a good sentence";
    			t10 = space();
    			br1 = element("br");
    			t11 = space();
    			p3 = element("p");
    			t12 = text(/*numOfSentences*/ ctx[1]);
    			t13 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t14 = space();
    			p4 = element("p");
    			t15 = space();
    			button = element("button");
    			button.textContent = "Convert To Text";
    			attr_dev(h3, "class", "svelte-pn327b");
    			add_location(h3, file$2, 145, 4, 4616);
    			attr_dev(textarea, "class", "texarea svelte-pn327b");
    			attr_dev(textarea, "placeholder", "Copy and paste the document you are wokring on in here");
    			attr_dev(textarea, "cols", "130");
    			attr_dev(textarea, "rows", "20");
    			add_location(textarea, file$2, 146, 4, 4667);
    			attr_dev(br0, "class", "svelte-pn327b");
    			add_location(br0, file$2, 147, 4, 4817);
    			attr_dev(p0, "class", "info-text svelte-pn327b");
    			set_style(p0, "background-color", "#da612f");
    			add_location(p0, file$2, 156, 8, 5230);
    			attr_dev(p1, "class", "info-text svelte-pn327b");
    			set_style(p1, "background-color", "#e0aa2f");
    			add_location(p1, file$2, 157, 8, 5322);
    			attr_dev(p2, "class", "info-text svelte-pn327b");
    			set_style(p2, "background-color", "#2dc86f");
    			add_location(p2, file$2, 158, 8, 5431);
    			attr_dev(div, "class", "info-box svelte-pn327b");
    			add_location(div, file$2, 155, 4, 5196);
    			attr_dev(br1, "class", "svelte-pn327b");
    			add_location(br1, file$2, 161, 4, 5536);
    			attr_dev(p3, "class", "svelte-pn327b");
    			add_location(p3, file$2, 163, 4, 5549);
    			attr_dev(p4, "class", "finalP svelte-pn327b");
    			add_location(p4, file$2, 168, 4, 5685);
    			attr_dev(button, "class", "svelte-pn327b");
    			add_location(button, file$2, 171, 4, 5730);
    			attr_dev(main, "class", "svelte-pn327b");
    			add_location(main, file$2, 143, 0, 4598);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h3);
    			append_dev(main, t1);
    			append_dev(main, textarea);
    			set_input_value(textarea, /*input*/ ctx[2]);
    			append_dev(main, t2);
    			append_dev(main, br0);
    			append_dev(main, t3);
    			if_block.m(main, null);
    			append_dev(main, t4);
    			append_dev(main, div);
    			append_dev(div, p0);
    			append_dev(div, t6);
    			append_dev(div, p1);
    			append_dev(div, t8);
    			append_dev(div, p2);
    			append_dev(main, t10);
    			append_dev(main, br1);
    			append_dev(main, t11);
    			append_dev(main, p3);
    			append_dev(p3, t12);
    			append_dev(main, t13);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(main, null);
    			}

    			append_dev(main, t14);
    			append_dev(main, p4);
    			p4.innerHTML = /*final*/ ctx[0];
    			append_dev(main, t15);
    			append_dev(main, button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[9]),
    					listen_dev(button, "click", /*convertBtn*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*input*/ 4) {
    				set_input_value(textarea, /*input*/ ctx[2]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(main, t4);
    				}
    			}

    			if (!current || dirty & /*numOfSentences*/ 2) set_data_dev(t12, /*numOfSentences*/ ctx[1]);

    			if (dirty & /*objArr, arrOfSen*/ 24) {
    				each_value = /*objArr*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(main, t14);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*final*/ 1) p4.innerHTML = /*final*/ ctx[0];		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_block.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function mprint(text) {
    	console.log(text);
    }

    function delBtn$1() {
    	mprint("del Btn Pressed");
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Body", slots, []);
    	let final = "";
    	let numOfSentences = " ";
    	let id = 3;
    	let input = "";
    	let subVal = "";
    	let arrOfSen = [];
    	let objArr = [];
    	let clicked = false;

    	function analyzeText() {
    		$$invalidate(1, numOfSentences = 0);
    		let start = 0;
    		let fin = 0;
    		let b = false;

    		for (let i = 0; i < subVal.length; i++) {
    			fin += 1;
    			let letter = subVal[i];
    			mprint(letter);

    			if (letter === "." || letter === "?" || letter === "!") {
    				$$invalidate(1, numOfSentences++, numOfSentences);
    				$$invalidate(3, arrOfSen = [...arrOfSen, subVal.substring(start, fin)]);
    				start = fin + 1;
    				mprint("Period detected");
    				b = true;
    			}

    			if (letter == "\n" && b == true) {
    				b = false;
    				$$invalidate(3, arrOfSen = [...arrOfSen, " "]);
    				mprint("Para Detected");
    			}
    		}

    		if (numOfSentences == 0) {
    			$$invalidate(3, arrOfSen = [subVal]);
    			$$invalidate(1, numOfSentences = 1);
    		}

    		mprint(arrOfSen);

    		for (let i = 0; i < arrOfSen.length; i++) {
    			id++;
    			$$invalidate(4, objArr = [...objArr, { id, name: arrOfSen[i] }]);
    		}

    		$$invalidate(1, numOfSentences = "Number Of Sentences: " + numOfSentences);
    	}

    	function onSub(event) {
    		if (event.key == "Enter") {
    			// console.log(arrOfSen)
    			subVal = input;

    			analyzeText();
    			$$invalidate(2, input = "");
    		}
    	}

    	function handleSubClick() {
    		subVal = "";
    		$$invalidate(3, arrOfSen = []);
    		$$invalidate(4, objArr = []);
    		subVal = input;
    		$$invalidate(5, clicked = true);
    		analyzeText();
    		$$invalidate(2, input = "");
    	}

    	// <!-- <input bind:value ={input} on:keypress={onSub}> -->
    	function convertBtn() {
    		$$invalidate(0, final = " ");
    		mprint("convertBtn Pressed");

    		for (let i = 0; i < arrOfSen.length; i++) {
    			if (arrOfSen[i] == " ") {
    				$$invalidate(0, final += "<br>");
    			}

    			$$invalidate(0, final += arrOfSen[i] + " ");
    		}

    		mprint(final);
    	}

    	//    <textarea contenteditable="true"  bind:innerHTML={arrOfSen[i]}>  {obj.name} </textarea>
    	function loremIpsum() {
    		$$invalidate(2, input = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu elementum justo. Proin ligula nulla, fermentum vel molestie lacinia, condimentum at tellus. Proin mattis in risus non condimentum. Pellentesque sit amet nisl aliquam, dapibus odio a, pretium neque. Donec tempus facilisis ante et imperdiet. Mauris at tempus est. Duis sed massa nunc. Pellentesque bibendum odio ac diam sollicitudin ornare. Nulla sollicitudin dui id pulvinar convallis. Nulla volutpat rhoncus dolor vel laoreet. Nunc consequat molestie mauris in varius. Integer vel purus varius, facilisis nunc a, facilisis nisi. Etiam interdum dolor et nisl pellentesque, laoreet ultrices risus sodales. Duis bibendum, diam semper feugiat volutpat, odio turpis laoreet leo, suscipit tempor nulla mi a urna. Proin egestas bibendum ex sit amet mattis. Phasellus scelerisque vitae tellus in feugiat. Quisque eu sem in nulla ullamcorper cursus in et velit. Cras ut massa volutpat, bibendum mauris et, sollicitudin diam. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Curabitur massa justo, consectetur in risus sed, commodo maximus nisi.");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Body> was created with unknown prop '${key}'`);
    	});

    	function textarea_input_handler() {
    		input = this.value;
    		$$invalidate(2, input);
    	}

    	const click_handler = () => {
    		window.location.reload(true);
    	};

    	function sentence_val_binding(value, i) {
    		arrOfSen[i] = value;
    		$$invalidate(3, arrOfSen);
    	}

    	$$self.$capture_state = () => ({
    		Sentence,
    		final,
    		numOfSentences,
    		id,
    		input,
    		subVal,
    		arrOfSen,
    		objArr,
    		clicked,
    		mprint,
    		analyzeText,
    		onSub,
    		handleSubClick,
    		convertBtn,
    		delBtn: delBtn$1,
    		loremIpsum
    	});

    	$$self.$inject_state = $$props => {
    		if ("final" in $$props) $$invalidate(0, final = $$props.final);
    		if ("numOfSentences" in $$props) $$invalidate(1, numOfSentences = $$props.numOfSentences);
    		if ("id" in $$props) id = $$props.id;
    		if ("input" in $$props) $$invalidate(2, input = $$props.input);
    		if ("subVal" in $$props) subVal = $$props.subVal;
    		if ("arrOfSen" in $$props) $$invalidate(3, arrOfSen = $$props.arrOfSen);
    		if ("objArr" in $$props) $$invalidate(4, objArr = $$props.objArr);
    		if ("clicked" in $$props) $$invalidate(5, clicked = $$props.clicked);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		final,
    		numOfSentences,
    		input,
    		arrOfSen,
    		objArr,
    		clicked,
    		handleSubClick,
    		convertBtn,
    		loremIpsum,
    		textarea_input_handler,
    		click_handler,
    		sentence_val_binding
    	];
    }

    class Body extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Body",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Footer\Footer.svelte generated by Svelte v3.31.1 */

    const file$3 = "src\\Footer\\Footer.svelte";

    function create_fragment$3(ctx) {
    	let footer;
    	let p0;
    	let t1;
    	let div;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let p1;
    	let t8;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			p0 = element("p");
    			p0.textContent = "Footer";
    			t1 = space();
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "Privacy Policy";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Contact";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "Philosophy";
    			t7 = space();
    			p1 = element("p");
    			t8 = text(/*text*/ ctx[0]);
    			add_location(p0, file$3, 59, 4, 1298);
    			attr_dev(button0, "class", "grid-item svelte-1s46h8d");
    			add_location(button0, file$3, 61, 8, 1355);
    			attr_dev(button1, "class", "grid-item svelte-1s46h8d");
    			add_location(button1, file$3, 62, 8, 1428);
    			attr_dev(button2, "class", "grid-item svelte-1s46h8d");
    			add_location(button2, file$3, 63, 8, 1493);
    			attr_dev(div, "class", "grid-container svelte-1s46h8d");
    			add_location(div, file$3, 60, 4, 1317);
    			attr_dev(p1, "class", "te svelte-1s46h8d");
    			add_location(p1, file$3, 65, 4, 1571);
    			attr_dev(footer, "class", "svelte-1s46h8d");
    			add_location(footer, file$3, 58, 0, 1284);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, p0);
    			append_dev(footer, t1);
    			append_dev(footer, div);
    			append_dev(div, button0);
    			append_dev(div, t3);
    			append_dev(div, button1);
    			append_dev(div, t5);
    			append_dev(div, button2);
    			append_dev(footer, t7);
    			append_dev(footer, p1);
    			append_dev(p1, t8);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*pp*/ ctx[1], false, false, false),
    					listen_dev(button1, "click", /*c*/ ctx[2], false, false, false),
    					listen_dev(button2, "click", /*p*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) set_data_dev(t8, /*text*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	let text = "";

    	function pp() {
    		if (!text) {
    			$$invalidate(0, text = "I plan on using google analytics and that's about it please I'm going to make one soon.");
    		} else {
    			$$invalidate(0, text = "");
    		}
    	}

    	function c() {
    		if (!text) {
    			$$invalidate(0, text = "Hello, if you want to contact the creator of this page, please send an e-mail to realnadlabs at gmail dot com");
    		} else {
    			$$invalidate(0, text = "");
    		}
    	}

    	function p() {
    		if (!text) {
    			$$invalidate(0, text = "Dr. Jordan Peterson often says a sentence that is about 10 words long is good. Too long and sometimes people may get lost. Having a short sentence has it's own problems. Upon this idea, this web app will let you analyze your text. Hopefully, any text will be parsed for long sentences and be highlighted.");
    		} else {
    			$$invalidate(0, text = "");
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ text, pp, c, p });

    	$$self.$inject_state = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text, pp, c, p];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.31.1 */
    const file$4 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let header;
    	let t0;
    	let body;
    	let t1;
    	let footer;
    	let current;
    	header = new Header({ $$inline: true });
    	body = new Body({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(header.$$.fragment);
    			t0 = space();
    			create_component(body.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			add_location(div, file$4, 10, 0, 168);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(header, div, null);
    			append_dev(div, t0);
    			mount_component(body, div, null);
    			append_dev(div, t1);
    			mount_component(footer, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(body.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(body.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(header);
    			destroy_component(body);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Body, Footer });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
