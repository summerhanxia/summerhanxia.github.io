
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
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
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
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

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
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
            mount_component(component, options.target, options.anchor, options.customElement);
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.2' }, detail), true));
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

    /* src/Components/Drills/PitchDrillCheck.svelte generated by Svelte v3.43.2 */

    const file$5 = "src/Components/Drills/PitchDrillCheck.svelte";

    function create_fragment$5(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "✔";
    			attr_dev(span, "class", "check-anwer svelte-mz8u0v");
    			toggle_class(span, "all-correct", /*allCorrect*/ ctx[0]);
    			add_location(span, file$5, 5, 0, 75);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (!mounted) {
    				dispose = listen_dev(
    					span,
    					"click",
    					function () {
    						if (is_function(/*toggleCheck*/ ctx[1])) /*toggleCheck*/ ctx[1].apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*allCorrect*/ 1) {
    				toggle_class(span, "all-correct", /*allCorrect*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PitchDrillCheck', slots, []);
    	let { allCorrect } = $$props;
    	let { toggleCheck } = $$props;
    	const writable_props = ['allCorrect', 'toggleCheck'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PitchDrillCheck> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('allCorrect' in $$props) $$invalidate(0, allCorrect = $$props.allCorrect);
    		if ('toggleCheck' in $$props) $$invalidate(1, toggleCheck = $$props.toggleCheck);
    	};

    	$$self.$capture_state = () => ({ allCorrect, toggleCheck });

    	$$self.$inject_state = $$props => {
    		if ('allCorrect' in $$props) $$invalidate(0, allCorrect = $$props.allCorrect);
    		if ('toggleCheck' in $$props) $$invalidate(1, toggleCheck = $$props.toggleCheck);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [allCorrect, toggleCheck];
    }

    class PitchDrillCheck extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { allCorrect: 0, toggleCheck: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PitchDrillCheck",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*allCorrect*/ ctx[0] === undefined && !('allCorrect' in props)) {
    			console.warn("<PitchDrillCheck> was created without expected prop 'allCorrect'");
    		}

    		if (/*toggleCheck*/ ctx[1] === undefined && !('toggleCheck' in props)) {
    			console.warn("<PitchDrillCheck> was created without expected prop 'toggleCheck'");
    		}
    	}

    	get allCorrect() {
    		throw new Error("<PitchDrillCheck>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allCorrect(value) {
    		throw new Error("<PitchDrillCheck>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get toggleCheck() {
    		throw new Error("<PitchDrillCheck>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set toggleCheck(value) {
    		throw new Error("<PitchDrillCheck>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const allAudios = writable(new Set());
    const allUnlocks = writable(new Set());
    const toggling = writable(false);

    /* src/Components/Drills/PitchDrill.svelte generated by Svelte v3.43.2 */

    const { console: console_1 } = globals;
    const file$4 = "src/Components/Drills/PitchDrill.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    // (71:4) {#if sentence.is_sentence}
    function create_if_block_1(ctx) {
    	let pitchdrillcheck;
    	let current;

    	pitchdrillcheck = new PitchDrillCheck({
    			props: {
    				allCorrect: /*allCorrect*/ ctx[2],
    				toggleCheck: /*toggleCheck*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(pitchdrillcheck.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(pitchdrillcheck, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const pitchdrillcheck_changes = {};
    			if (dirty & /*allCorrect*/ 4) pitchdrillcheck_changes.allCorrect = /*allCorrect*/ ctx[2];
    			pitchdrillcheck.$set(pitchdrillcheck_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pitchdrillcheck.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pitchdrillcheck.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(pitchdrillcheck, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(71:4) {#if sentence.is_sentence}",
    		ctx
    	});

    	return block;
    }

    // (74:4) {#each [...sentence.hiragana] as char, idx (idx) }
    function create_each_block$1(key_1, ctx) {
    	let span;
    	let t_value = /*char*/ ctx[16] + "";
    	let t;
    	let span_class_value;
    	let mounted;
    	let dispose;

    	function mousedown_handler() {
    		return /*mousedown_handler*/ ctx[10](/*idx*/ ctx[18]);
    	}

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[11](/*idx*/ ctx[18]);
    	}

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", span_class_value = "state-" + /*states*/ ctx[1][/*idx*/ ctx[18]] + " svelte-e97czy");
    			toggle_class(span, "character", /*states*/ ctx[1][/*idx*/ ctx[18]] != 2);
    			toggle_class(span, "correct", /*showAnswer*/ ctx[3] && /*states*/ ctx[1][/*idx*/ ctx[18]] == /*sentence*/ ctx[0].pitch.charAt(/*idx*/ ctx[18]));
    			toggle_class(span, "wrong", /*showAnswer*/ ctx[3] && /*states*/ ctx[1][/*idx*/ ctx[18]] != /*sentence*/ ctx[0].pitch.charAt(/*idx*/ ctx[18]));
    			toggle_class(span, "vertical", /*idx*/ ctx[18] > 0 && /*states*/ ctx[1][/*idx*/ ctx[18]] != '_' && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != '_' && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != /*states*/ ctx[1][/*idx*/ ctx[18]]);
    			toggle_class(span, "vertical-wrong", /*idx*/ ctx[18] > 0 && /*states*/ ctx[1][/*idx*/ ctx[18]] != '_' && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != '_' && /*showAnswer*/ ctx[3] && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != /*sentence*/ ctx[0].pitch.charAt(/*idx*/ ctx[18] - 1));
    			add_location(span, file$4, 74, 8, 2011);
    			this.first = span;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = [
    					listen_dev(span, "mousedown", mousedown_handler, false, false, false),
    					listen_dev(span, "mouseenter", mouseenter_handler, false, false, false),
    					listen_dev(span, "touchstart", /*touchstart_handler*/ ctx[12], { passive: true }, false, false),
    					listen_dev(span, "touchmove", /*onTouchmove*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*sentence*/ 1 && t_value !== (t_value = /*char*/ ctx[16] + "")) set_data_dev(t, t_value);

    			if (dirty & /*states, sentence*/ 3 && span_class_value !== (span_class_value = "state-" + /*states*/ ctx[1][/*idx*/ ctx[18]] + " svelte-e97czy")) {
    				attr_dev(span, "class", span_class_value);
    			}

    			if (dirty & /*states, sentence, states, sentence*/ 3) {
    				toggle_class(span, "character", /*states*/ ctx[1][/*idx*/ ctx[18]] != 2);
    			}

    			if (dirty & /*states, sentence, showAnswer, states, sentence*/ 11) {
    				toggle_class(span, "correct", /*showAnswer*/ ctx[3] && /*states*/ ctx[1][/*idx*/ ctx[18]] == /*sentence*/ ctx[0].pitch.charAt(/*idx*/ ctx[18]));
    			}

    			if (dirty & /*states, sentence, showAnswer, states, sentence*/ 11) {
    				toggle_class(span, "wrong", /*showAnswer*/ ctx[3] && /*states*/ ctx[1][/*idx*/ ctx[18]] != /*sentence*/ ctx[0].pitch.charAt(/*idx*/ ctx[18]));
    			}

    			if (dirty & /*states, sentence, sentence, states*/ 3) {
    				toggle_class(span, "vertical", /*idx*/ ctx[18] > 0 && /*states*/ ctx[1][/*idx*/ ctx[18]] != '_' && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != '_' && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != /*states*/ ctx[1][/*idx*/ ctx[18]]);
    			}

    			if (dirty & /*states, sentence, sentence, states, showAnswer*/ 11) {
    				toggle_class(span, "vertical-wrong", /*idx*/ ctx[18] > 0 && /*states*/ ctx[1][/*idx*/ ctx[18]] != '_' && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != '_' && /*showAnswer*/ ctx[3] && /*states*/ ctx[1][/*idx*/ ctx[18] - 1] != /*sentence*/ ctx[0].pitch.charAt(/*idx*/ ctx[18] - 1));
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(74:4) {#each [...sentence.hiragana] as char, idx (idx) }",
    		ctx
    	});

    	return block;
    }

    // (94:4) {#if sentence.is_sentence}
    function create_if_block$1(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "♻️";
    			attr_dev(span, "class", "reset-button svelte-e97czy");
    			add_location(span, file$4, 94, 8, 2911);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*reset*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(94:4) {#if sentence.is_sentence}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let t0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t1;
    	let current;
    	let if_block0 = /*sentence*/ ctx[0].is_sentence && create_if_block_1(ctx);
    	let each_value = [.../*sentence*/ ctx[0].hiragana];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*idx*/ ctx[18];
    	validate_each_keys(ctx, each_value, get_each_context$1, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	let if_block1 = /*sentence*/ ctx[0].is_sentence && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div, "class", "pitch-accent d-flex flex-row flex-wrap flat svelte-e97czy");
    			add_location(div, file$4, 69, 0, 1794);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t1);
    			if (if_block1) if_block1.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*sentence*/ ctx[0].is_sentence) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*sentence*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*states, sentence, showAnswer, $toggling, change, onTouchmove*/ 315) {
    				each_value = [.../*sentence*/ ctx[0].hiragana];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block$1, t1, get_each_context$1);
    			}

    			if (/*sentence*/ ctx[0].is_sentence) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (if_block1) if_block1.d();
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
    	let $allUnlocks;
    	let $toggling;
    	validate_store(allUnlocks, 'allUnlocks');
    	component_subscribe($$self, allUnlocks, $$value => $$invalidate(13, $allUnlocks = $$value));
    	validate_store(toggling, 'toggling');
    	component_subscribe($$self, toggling, $$value => $$invalidate(4, $toggling = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PitchDrill', slots, []);
    	let { sentence } = $$props;
    	let allCorrect = false;
    	let showAnswer = false;
    	let states = [];
    	let locks = [];
    	const next = { 'L': 'H', 'H': 'L' };

    	const change = idx => {
    		// console.log(locks[idx])
    		if ($toggling && !locks[idx] && sentence && sentence.pitch.charAt(idx) != '_') {
    			$$invalidate(1, states[idx] = next[states[idx]], states);
    			$$invalidate(9, locks[idx] = true, locks);
    			console.log(states.join(''));
    		}
    	};

    	const reset = () => {
    		$$invalidate(1, states = sentence.pitch.split('').map(x => x == '_' ? '_' : 'L'));
    		$$invalidate(3, showAnswer = false);
    	};

    	const toggleCheck = () => {
    		$$invalidate(3, showAnswer = !showAnswer);
    	};

    	const unlock = () => {
    		$$invalidate(9, locks = sentence.pitch.split('').map(x => false));
    	};

    	const onTouchmove = e => {
    		let { clientX, clientY } = e.touches[0];
    		let el = document.elementFromPoint(clientX, clientY);
    		console.log(el.classList.contains('character'));

    		if (el.classList.contains('character')) {
    			let clickEvent = document.createEvent('MouseEvents');
    			clickEvent.initEvent('mousedown', true, true);
    			el.dispatchEvent(clickEvent);
    		}

    		
    	};

    	onMount(() => {
    		$allUnlocks.add(unlock);
    		return () => allUnlocks.delete(unlock);
    	});

    	const writable_props = ['sentence'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<PitchDrill> was created with unknown prop '${key}'`);
    	});

    	const mousedown_handler = idx => {
    		set_store_value(toggling, $toggling = true, $toggling);
    		change(idx);
    	};

    	const mouseenter_handler = idx => change(idx);

    	const touchstart_handler = () => {
    		set_store_value(toggling, $toggling = true, $toggling);
    	};

    	$$self.$$set = $$props => {
    		if ('sentence' in $$props) $$invalidate(0, sentence = $$props.sentence);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		PitchDrillCheck,
    		toggling,
    		allUnlocks,
    		sentence,
    		allCorrect,
    		showAnswer,
    		states,
    		locks,
    		next,
    		change,
    		reset,
    		toggleCheck,
    		unlock,
    		onTouchmove,
    		$allUnlocks,
    		$toggling
    	});

    	$$self.$inject_state = $$props => {
    		if ('sentence' in $$props) $$invalidate(0, sentence = $$props.sentence);
    		if ('allCorrect' in $$props) $$invalidate(2, allCorrect = $$props.allCorrect);
    		if ('showAnswer' in $$props) $$invalidate(3, showAnswer = $$props.showAnswer);
    		if ('states' in $$props) $$invalidate(1, states = $$props.states);
    		if ('locks' in $$props) $$invalidate(9, locks = $$props.locks);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*sentence, states*/ 3) {
    			if (sentence.pitch && !states.length) reset();
    		}

    		if ($$self.$$.dirty & /*sentence, locks*/ 513) {
    			if (sentence.pitch && !locks.length) unlock();
    		}

    		if ($$self.$$.dirty & /*states, sentence*/ 3) {
    			if (states.join('') == sentence.pitch) {
    				$$invalidate(3, showAnswer = $$invalidate(2, allCorrect = true));
    			} else {
    				$$invalidate(2, allCorrect = false);
    			}
    		}
    	};

    	return [
    		sentence,
    		states,
    		allCorrect,
    		showAnswer,
    		$toggling,
    		change,
    		reset,
    		toggleCheck,
    		onTouchmove,
    		locks,
    		mousedown_handler,
    		mouseenter_handler,
    		touchstart_handler
    	];
    }

    class PitchDrill extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { sentence: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PitchDrill",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*sentence*/ ctx[0] === undefined && !('sentence' in props)) {
    			console_1.warn("<PitchDrill> was created without expected prop 'sentence'");
    		}
    	}

    	get sentence() {
    		throw new Error("<PitchDrill>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sentence(value) {
    		throw new Error("<PitchDrill>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Workshop/WordCard.svelte generated by Svelte v3.43.2 */
    const file$3 = "src/Components/Workshop/WordCard.svelte";

    // (32:4) {#if word && word.text}
    function create_if_block(ctx) {
    	let span;
    	let t_value = /*word*/ ctx[0].text + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			attr_dev(span, "class", "text svelte-l4oxus");
    			add_location(span, file$3, 32, 8, 762);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*word*/ 1 && t_value !== (t_value = /*word*/ ctx[0].text + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(32:4) {#if word && word.text}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div1;
    	let audio;
    	let audio_src_value;
    	let t0;
    	let div0;
    	let t2;
    	let t3;
    	let pitchdrill;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*word*/ ctx[0] && /*word*/ ctx[0].text && create_if_block(ctx);

    	pitchdrill = new PitchDrill({
    			props: { sentence: /*word*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			audio = element("audio");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "▶";
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			create_component(pitchdrill.$$.fragment);
    			attr_dev(audio, "controlslist", "nodownload");
    			attr_dev(audio, "preload", "auto");
    			if (!src_url_equal(audio.src, audio_src_value = /*word*/ ctx[0].audio)) attr_dev(audio, "src", audio_src_value);
    			add_location(audio, file$3, 24, 4, 549);
    			attr_dev(div0, "class", "play-button svelte-l4oxus");
    			add_location(div0, file$3, 30, 4, 677);
    			attr_dev(div1, "class", "card d-flex flex-row align-items-center flex-wrap svelte-l4oxus");
    			add_location(div1, file$3, 23, 0, 481);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, audio);
    			/*audio_binding*/ ctx[3](audio);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div1, t2);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t3);
    			mount_component(pitchdrill, div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*play*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*word*/ 1 && !src_url_equal(audio.src, audio_src_value = /*word*/ ctx[0].audio)) {
    				attr_dev(audio, "src", audio_src_value);
    			}

    			if (/*word*/ ctx[0] && /*word*/ ctx[0].text) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			const pitchdrill_changes = {};
    			if (dirty & /*word*/ 1) pitchdrill_changes.sentence = /*word*/ ctx[0];
    			pitchdrill.$set(pitchdrill_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pitchdrill.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pitchdrill.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*audio_binding*/ ctx[3](null);
    			if (if_block) if_block.d();
    			destroy_component(pitchdrill);
    			mounted = false;
    			dispose();
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
    	let $allAudios;
    	validate_store(allAudios, 'allAudios');
    	component_subscribe($$self, allAudios, $$value => $$invalidate(4, $allAudios = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WordCard', slots, []);
    	let { word = {} } = $$props;
    	let player;

    	onMount(() => {
    		$allAudios.add(player);
    		return () => allAudios.delete(player);
    	});

    	const play = () => {
    		$allAudios.forEach(audio => {
    			audio.pause();
    		});

    		$$invalidate(1, player.currentTime = 0, player);
    		player.play();
    	};

    	const writable_props = ['word'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WordCard> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			player = $$value;
    			$$invalidate(1, player);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		PitchDrill,
    		allAudios,
    		word,
    		player,
    		play,
    		$allAudios
    	});

    	$$self.$inject_state = $$props => {
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    		if ('player' in $$props) $$invalidate(1, player = $$props.player);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [word, player, play, audio_binding];
    }

    class WordCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { word: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WordCard",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get word() {
    		throw new Error("<WordCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set word(value) {
    		throw new Error("<WordCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Components/Workshop/SentenceCard.svelte generated by Svelte v3.43.2 */
    const file$2 = "src/Components/Workshop/SentenceCard.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let audio;
    	let audio_src_value;
    	let t0;
    	let div1;
    	let div0;
    	let t2;
    	let t3_value = /*sentence*/ ctx[0].text + "";
    	let t3;
    	let t4;
    	let pitchdrill;
    	let current;
    	let mounted;
    	let dispose;

    	pitchdrill = new PitchDrill({
    			props: { sentence: /*sentence*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			audio = element("audio");
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "▶";
    			t2 = space();
    			t3 = text(t3_value);
    			t4 = space();
    			create_component(pitchdrill.$$.fragment);
    			attr_dev(audio, "controlslist", "nodownload");
    			attr_dev(audio, "preload", "auto");
    			if (!src_url_equal(audio.src, audio_src_value = /*sentence*/ ctx[0].audio)) attr_dev(audio, "src", audio_src_value);
    			add_location(audio, file$2, 23, 4, 507);
    			attr_dev(div0, "class", "play-button svelte-9c64qs");
    			add_location(div0, file$2, 30, 8, 665);
    			attr_dev(div1, "class", "text svelte-9c64qs");
    			add_location(div1, file$2, 29, 4, 638);
    			attr_dev(div2, "class", "card svelte-9c64qs");
    			add_location(div2, file$2, 22, 0, 484);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, audio);
    			/*audio_binding*/ ctx[3](audio);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t2);
    			append_dev(div1, t3);
    			append_dev(div2, t4);
    			mount_component(pitchdrill, div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*play*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*sentence*/ 1 && !src_url_equal(audio.src, audio_src_value = /*sentence*/ ctx[0].audio)) {
    				attr_dev(audio, "src", audio_src_value);
    			}

    			if ((!current || dirty & /*sentence*/ 1) && t3_value !== (t3_value = /*sentence*/ ctx[0].text + "")) set_data_dev(t3, t3_value);
    			const pitchdrill_changes = {};
    			if (dirty & /*sentence*/ 1) pitchdrill_changes.sentence = /*sentence*/ ctx[0];
    			pitchdrill.$set(pitchdrill_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pitchdrill.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pitchdrill.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			/*audio_binding*/ ctx[3](null);
    			destroy_component(pitchdrill);
    			mounted = false;
    			dispose();
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

    function instance$2($$self, $$props, $$invalidate) {
    	let $allAudios;
    	validate_store(allAudios, 'allAudios');
    	component_subscribe($$self, allAudios, $$value => $$invalidate(4, $allAudios = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SentenceCard', slots, []);
    	let { sentence = {} } = $$props;
    	let player;

    	onMount(() => {
    		$allAudios.add(player);
    		return () => allAudios.delete(player);
    	});

    	const play = () => {
    		$allAudios.forEach(audio => {
    			audio.pause();
    		});

    		$$invalidate(1, player.currentTime = 0, player);
    		player.play();
    	};

    	const writable_props = ['sentence'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SentenceCard> was created with unknown prop '${key}'`);
    	});

    	function audio_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			player = $$value;
    			$$invalidate(1, player);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('sentence' in $$props) $$invalidate(0, sentence = $$props.sentence);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		PitchDrill,
    		allAudios,
    		sentence,
    		player,
    		play,
    		$allAudios
    	});

    	$$self.$inject_state = $$props => {
    		if ('sentence' in $$props) $$invalidate(0, sentence = $$props.sentence);
    		if ('player' in $$props) $$invalidate(1, player = $$props.player);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [sentence, player, play, audio_binding];
    }

    class SentenceCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { sentence: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SentenceCard",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get sentence() {
    		throw new Error("<SentenceCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sentence(value) {
    		throw new Error("<SentenceCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const words = [
     {'idx': '01',
      'text': '',
      'hiragana': 'アウト',
      'pitch': 'HLL',
      'audio': '/assets/pitch-workshop/01.アウト.mp3'},
     {'idx': '02',
      'text': '',
      'hiragana': 'ところで',
      'pitch': 'LHHL',
      'audio': '/assets/pitch-workshop/02.ところで.mp3'},
     {'idx': '03',
      'text': '',
      'hiragana': '覚める',
      'pitch': 'LHL',
      'audio': '/assets/pitch-workshop/03.覚める.mp3'},
     {'idx': '04',
      'text': '昨夜',
      'hiragana': 'さくや',
      'pitch': 'LHL',
      'audio': '/assets/pitch-workshop/04.昨夜.mp3'},
     {'idx': '05',
      'text': '',
      'hiragana': 'だんだん',
      'pitch': 'LHHH',
      'audio': '/assets/pitch-workshop/05.だんだん.mp3'},
     {'idx': '06',
      'text': '',
      'hiragana': 'クライアント',
      'pitch': 'LHLLLL',
      'audio': '/assets/pitch-workshop/06.クライアント.mp3'},
     {'idx': '07',
      'text': '服',
      'hiragana': 'ふく',
      'pitch': 'LH',
      'audio': '/assets/pitch-workshop/07.服.mp3'},
     {'idx': '08',
      'text': '',
      'hiragana': '着る',
      'pitch': 'LH',
      'audio': '/assets/pitch-workshop/08.着る.mp3'},
     {'idx': '09',
      'text': '',
      'hiragana': '切る',
      'pitch': 'HL',
      'audio': '/assets/pitch-workshop/09.切る.mp3'},
     {'idx': '10',
      'text': '',
      'hiragana': 'テンション',
      'pitch': 'HLLLL',
      'audio': '/assets/pitch-workshop/10.テンション.mp3'},
     {'idx': '11',
      'text': '',
      'hiragana': 'コーディネート',
      'pitch': 'LHHHHLL',
      'audio': '/assets/pitch-workshop/11.コーディネート.mp3'},
     {'idx': '12',
      'text': '',
      'hiragana': 'ヘアスタイル',
      'pitch': 'LHHHLL',
      'audio': '/assets/pitch-workshop/12.ヘアスタイル.mp3'},
     {'idx': '13',
      'text': '',
      'hiragana': 'うまく',
      'pitch': 'HLL',
      'audio': '/assets/pitch-workshop/13.うまく.mp3'},
     {'idx': '14',
      'text': '',
      'hiragana': 'ストレッチ',
      'pitch': 'LHHLL',
      'audio': '/assets/pitch-workshop/14.ストレッチ.mp3'}
    ];

    const sentences = [
     {'idx': '01',
      'text': 'ここで二度寝したら、きっとアウトだな…',
      'hiragana': 'ここでにどねしたら、きっとアウトだな…',
      'pitch': 'LHHLHHHLL_LHHHLLLL_',
      'audio': '/assets/pitch-workshop/s1.mp3',
      'is_sentence': 'true'},
     {'idx': '02',
      'text': 'ああ！いいところで目が覚めちゃった。',
      'hiragana': 'ああ！いいところでめがさめちゃった。',
      'pitch': 'LH_HLHLLLLHHLLLLL_',
      'audio': '/assets/pitch-workshop/s2-1.mp3',
      'is_sentence': 'true'},
     {'idx': '03',
      'text': 'ああ！いいところで目が覚めちゃった。（けいさん版本）',
      'hiragana': 'ああ！いいところでめがさめちゃった。',
      'pitch': 'HL_HLLLLLHLHLLLLL_',
      'audio': '/assets/pitch-workshop/s2-2.mp3',
      'is_sentence': 'true'},
     {'idx': '04',
      'text': 'だんだん朝起きるのがつらくなってきた。',
      'hiragana': 'だんだんあさおきるのがつらくなってきた。',
      'pitch': 'LHHHHLLHHHLLHHHLLLL_',
      'audio': '/assets/pitch-workshop/s3.mp3',
      'is_sentence': 'true'},
     {'idx': '05',
      'text': '新しい服を着るとテンションが上がるんだよね。',
      'hiragana': 'あたらしいふくをきるとテンションがあがるんだよね。',
      'pitch': 'LHHHLLHHLHHHLLLLLLHHLHLL_',
      'audio': '/assets/pitch-workshop/s4.mp3',
      'is_sentence': 'true'},
     {'idx': '06',
      'text': '今日のコーディネートはすごくいい感じ。',
      'hiragana': 'きょうのコーディネートはすごくいいかんじ。',
      'pitch': 'HHLLLHHHHLLLLHLHLHLL_',
      'audio': '/assets/pitch-workshop/s5.mp3',
      'is_sentence': 'true'},
     {'idx': '07',
      'text': 'う、のどがいがらっぽい、風邪ひいたかな。',
      'hiragana': 'う、のどがいがらっぽい、かぜひいたかな。',
      'pitch': '__HLLLHHHHLLLHLHHHL_',
      'audio': '/assets/pitch-workshop/s6.mp3',
      'is_sentence': 'true'},
    ];

    /* src/Components/PitchWorkshop.svelte generated by Svelte v3.43.2 */
    const file$1 = "src/Components/PitchWorkshop.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (17:12) {#each words as word (word.idx)}
    function create_each_block_1(key_1, ctx) {
    	let first;
    	let wordcard;
    	let current;

    	wordcard = new WordCard({
    			props: { word: /*word*/ ctx[3] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(wordcard.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(wordcard, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wordcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wordcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(wordcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(17:12) {#each words as word (word.idx)}",
    		ctx
    	});

    	return block;
    }

    // (24:8) {#each sentences as sentence (sentence.idx)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let sentencecard;
    	let current;

    	sentencecard = new SentenceCard({
    			props: { sentence: /*sentence*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(sentencecard.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(sentencecard, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sentencecard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sentencecard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(sentencecard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(24:8) {#each sentences as sentence (sentence.idx)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let div2;
    	let h1;
    	let t0;
    	let strong0;
    	let span;
    	let t3;
    	let p0;
    	let t4;
    	let strong1;
    	let t6;
    	let p1;
    	let t7;
    	let strong2;
    	let t9;
    	let t10;
    	let hr0;
    	let t11;
    	let h20;
    	let t12;
    	let strong3;
    	let t14;
    	let t15;
    	let div0;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t16;
    	let hr1;
    	let t17;
    	let h21;
    	let t18;
    	let strong4;
    	let t20;
    	let t21;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let t22;
    	let hr2;
    	let t23;
    	let div1;
    	let t24;
    	let div4;
    	let img;
    	let img_src_value;
    	let current;
    	let each_value_1 = words;
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*word*/ ctx[3].idx;
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = sentences;
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*sentence*/ ctx[0].idx;
    	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			h1 = element("h1");
    			t0 = text("掌握日语发音的");
    			strong0 = element("strong");
    			strong0.textContent = "语流音变";
    			span = element("span");
    			span.textContent = "（练习篇）";
    			t3 = space();
    			p0 = element("p");
    			t4 = text("讲师：");
    			strong1 = element("strong");
    			strong1.textContent = "Summer夏涵";
    			t6 = space();
    			p1 = element("p");
    			t7 = text("@");
    			strong2 = element("strong");
    			strong2.textContent = "英日双语看世界";
    			t9 = text(" 微信公众号");
    			t10 = space();
    			hr0 = element("hr");
    			t11 = space();
    			h20 = element("h2");
    			t12 = text("08. 掌握日语单词的「");
    			strong3 = element("strong");
    			strong3.textContent = "绝对";
    			t14 = text("音高/低」");
    			t15 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t16 = space();
    			hr1 = element("hr");
    			t17 = space();
    			h21 = element("h2");
    			t18 = text("09. 听辨在句子中的「");
    			strong4 = element("strong");
    			strong4.textContent = "相对";
    			t20 = text("音高/低」");
    			t21 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t22 = space();
    			hr2 = element("hr");
    			t23 = space();
    			div1 = element("div");
    			t24 = space();
    			div4 = element("div");
    			img = element("img");
    			attr_dev(strong0, "class", "light svelte-18pz6rf");
    			add_location(strong0, file$1, 9, 39, 300);
    			attr_dev(span, "class", "line svelte-18pz6rf");
    			add_location(span, file$1, 9, 74, 335);
    			attr_dev(h1, "class", "text-center svelte-18pz6rf");
    			add_location(h1, file$1, 9, 8, 269);
    			attr_dev(strong1, "class", "light svelte-18pz6rf");
    			add_location(strong1, file$1, 10, 41, 416);
    			attr_dev(p0, "class", "text-center credit svelte-18pz6rf");
    			add_location(p0, file$1, 10, 8, 383);
    			attr_dev(strong2, "class", "light svelte-18pz6rf");
    			add_location(strong2, file$1, 11, 39, 499);
    			attr_dev(p1, "class", "text-center credit svelte-18pz6rf");
    			add_location(p1, file$1, 11, 8, 468);
    			attr_dev(hr0, "class", "svelte-18pz6rf");
    			add_location(hr0, file$1, 13, 8, 557);
    			attr_dev(strong3, "class", "svelte-18pz6rf");
    			add_location(strong3, file$1, 14, 24, 586);
    			attr_dev(h20, "class", "svelte-18pz6rf");
    			add_location(h20, file$1, 14, 8, 570);
    			attr_dev(div0, "class", "d-flex flex-wrap svelte-18pz6rf");
    			add_location(div0, file$1, 15, 8, 624);
    			attr_dev(hr1, "class", "svelte-18pz6rf");
    			add_location(hr1, file$1, 21, 8, 788);
    			attr_dev(strong4, "class", "svelte-18pz6rf");
    			add_location(strong4, file$1, 22, 24, 817);
    			attr_dev(h21, "class", "svelte-18pz6rf");
    			add_location(h21, file$1, 22, 8, 801);
    			attr_dev(hr2, "class", "svelte-18pz6rf");
    			add_location(hr2, file$1, 27, 8, 964);
    			attr_dev(div1, "class", "empty svelte-18pz6rf");
    			add_location(div1, file$1, 28, 8, 977);
    			attr_dev(div2, "class", "main svelte-18pz6rf");
    			add_location(div2, file$1, 8, 4, 242);
    			attr_dev(div3, "class", "container svelte-18pz6rf");
    			add_location(div3, file$1, 7, 0, 214);
    			attr_dev(img, "class", "banner svelte-18pz6rf");
    			if (!src_url_equal(img.src, img_src_value = "assets/images/banner-white.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$1, 33, 4, 1053);
    			attr_dev(div4, "class", "fixed-bottom svelte-18pz6rf");
    			add_location(div4, file$1, 32, 0, 1022);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(h1, t0);
    			append_dev(h1, strong0);
    			append_dev(h1, span);
    			append_dev(div2, t3);
    			append_dev(div2, p0);
    			append_dev(p0, t4);
    			append_dev(p0, strong1);
    			append_dev(div2, t6);
    			append_dev(div2, p1);
    			append_dev(p1, t7);
    			append_dev(p1, strong2);
    			append_dev(p1, t9);
    			append_dev(div2, t10);
    			append_dev(div2, hr0);
    			append_dev(div2, t11);
    			append_dev(div2, h20);
    			append_dev(h20, t12);
    			append_dev(h20, strong3);
    			append_dev(h20, t14);
    			append_dev(div2, t15);
    			append_dev(div2, div0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div0, null);
    			}

    			append_dev(div2, t16);
    			append_dev(div2, hr1);
    			append_dev(div2, t17);
    			append_dev(div2, h21);
    			append_dev(h21, t18);
    			append_dev(h21, strong4);
    			append_dev(h21, t20);
    			append_dev(div2, t21);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t22);
    			append_dev(div2, hr2);
    			append_dev(div2, t23);
    			append_dev(div2, div1);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*words*/ 0) {
    				each_value_1 = words;
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div0, outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				check_outros();
    			}

    			if (dirty & /*sentences*/ 0) {
    				each_value = sentences;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, div2, outro_and_destroy_block, create_each_block, t22, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(div4);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PitchWorkshop', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PitchWorkshop> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ WordCard, SentenceCard, words, sentences });
    	return [];
    }

    class PitchWorkshop extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PitchWorkshop",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Components/App.svelte generated by Svelte v3.43.2 */
    const file = "src/Components/App.svelte";

    function create_fragment(ctx) {
    	let link;
    	let t;
    	let pitchworkshop;
    	let current;
    	let mounted;
    	let dispose;
    	pitchworkshop = new PitchWorkshop({ $$inline: true });

    	const block = {
    		c: function create() {
    			link = element("link");
    			t = space();
    			create_component(pitchworkshop.$$.fragment);
    			attr_dev(link, "href", "https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css");
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "integrity", "sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3");
    			attr_dev(link, "crossorigin", "anonymous");
    			add_location(link, file, 15, 4, 342);
    			document.title = "Summer's Japanese Pitch-Accent Workshop";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t, anchor);
    			mount_component(pitchworkshop, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "mouseup", /*release*/ ctx[0], false, false, false),
    					listen_dev(window, "touchend", /*release*/ ctx[0], false, false, false),
    					listen_dev(window, "touchcancel", /*release*/ ctx[0], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pitchworkshop.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pitchworkshop.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t);
    			destroy_component(pitchworkshop, detaching);
    			mounted = false;
    			run_all(dispose);
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

    function instance($$self, $$props, $$invalidate) {
    	let $allUnlocks;
    	let $toggling;
    	validate_store(allUnlocks, 'allUnlocks');
    	component_subscribe($$self, allUnlocks, $$value => $$invalidate(1, $allUnlocks = $$value));
    	validate_store(toggling, 'toggling');
    	component_subscribe($$self, toggling, $$value => $$invalidate(2, $toggling = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	const release = () => {
    		set_store_value(toggling, $toggling = false, $toggling);

    		setTimeout(
    			function () {
    				$allUnlocks.forEach(unlock => unlock());
    			},
    			300
    		);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		PitchWorkshop,
    		toggling,
    		allUnlocks,
    		release,
    		$allUnlocks,
    		$toggling
    	});

    	return [release];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
