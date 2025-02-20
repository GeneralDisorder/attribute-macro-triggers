class AttributeMacroTriggers {
    static ID = 'attribute-macro-triggers';
    static enableLogs = true;
    
    static SETTINGS = {
        TRACKED_STAT: "tracked_stat",
        POSITIVE_MACRO: "positive_macro",
        NEGATIVE_MACRO: "negative_macro",
        MENU: "amt_settings_menu",
        TRACKED_ATTRIBUTES: "trackedAttributes"
    }
    
    static log(force, ...args) {  
        const shouldLog = force || this.enableLogs;

        if (shouldLog) {
            console.log(this.ID, '|', ...args);
        }
    }
    
    static initialize() {
        AttributeMacroTriggers.log(false, "Initializing attribute-macro-triggers!");
        
        game.settings.register(this.ID, this.SETTINGS.TRACKED_STAT,{
            name: "Tracked attribute",
            hint: "The attribute path that should be tracked for changes. (Like 'system.other.stress.value')",
            scope: "world",
            config: true,
            requiresReload: false,
            type: String,
            default: "system.other.stress.value"
        });
        game.settings.register(this.ID, this.SETTINGS.POSITIVE_MACRO,{
            name: "Positive Macro",
            hint: "The id of a macro to trigger when attribute is increased.",
            scope: "world",
            config: true,
            requiresReload: false,
            type: String,
            default: ""
        });
        game.settings.register(this.ID, this.SETTINGS.NEGATIVE_MACRO,{
            name: "Negative Macro",
            hint: "The id of a macro to trigger when attribute is decreased.",
            scope: "world",
            config: true,
            requiresReload: false,
            type: String,
            default: ""
        });
        game.settings.registerMenu(this.ID, this.SETTINGS.MENU, {
            name: "Attribute Macro Triggers Submenu",
            label: "Settings Menu Label",
            hint: "Hint?",
            icon: 'fas fa-align-justify',
            type: AMTSettingsFormApplication,
            restricted: true
        });
        game.settings.register(this.ID, this.SETTINGS.TRACKED_ATTRIBUTES, {
		scope: "world",
		config: false,
		default: [],
		type: Array,
	});
    }
}

//Most of this is based on the settings form from Monk's Actionbar
//It was well made, readable, and fit my usecase
class AMTSettingsFormApplication extends FormApplication {
    constructor (object, options = {}) {
        //AttributeMacroTriggers.log(false, "AMTSettingsFormApplication Constructor. Object:", ob)
        let trackedAttributes = game.settings.get(AttributeMacroTriggers.ID, AttributeMacroTriggers.SETTINGS.TRACKED_ATTRIBUTES)
        //object.setFlag('attribute-macro-triggers', 'trackedAttributes', this.trackedAttributes)
        super(object, options);
        this.ID = AttributeMacroTriggers.ID;
        this.SETTINGS = AttributeMacroTriggers.SETTINGS;
        this.trackedAttributes = trackedAttributes
        let player = game.actors.find(a => a.type == 'character');
        if (player) {
            let systemAttributes = getDocumentClass("Token")?.getTrackedAttributes(player.system ?? {});
            if (systemAttributes)
                this.systemAttributes = systemAttributes.value.concat(systemAttributes.bar).map(a => a.join('.'));
        }
    }
    
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['form'],
            template: 'modules/attribute-macro-triggers/templates/amtsettings.html',
            id: "amt-settings-form",
            title: "Attribute Macro Triggers",
            closeOnSubmit: true,
            resizable: true,
            popOut: true
        });
    }
    
    getData() {
        return this.trackedAttributes;
    }
    
    addAttribute(event) {
        AttributeMacroTriggers.log(false, "Adding New Tracked Attribute")
        this.trackedAttributes.push({ id: foundry.utils.randomID(), path: "default.path", macro_inc: "", macro_dec: ""});
        this.render(true);
    }

    removeAttribute(event) {
        AttributeMacroTriggers.log(false, "Trying to remove attribute.")
        let attributeId = event.currentTarget.closest('.item').dataset.id;
        this.trackedAttributes.findSplice(a => a.id === attributeId);
        $('.item[data-id="' + attributeId + '"]', this.element).remove();
    }

    resetAttributes() {
        AttributeMacroTriggers.log(false, "Trying to reset attributes.")
        if (Object.keys(this.object).length != 0) {
            this.trackedAttributes = [];
            this.object.unsetFlag(AttributeMacroTriggers.ID, 'trackedAttributes');
            this.close();
        }
        else
            this.trackedAttributes = [];
        this.render(true);
        let that = this;
        window.setTimeout(function () { that.setPosition(); }, 100);
    }
    
    changePath(event) {
        AttributeMacroTriggers.log(false, "Updating text!", event);
        let attributeId = event.currentTarget.closest('.item').dataset.id;
        let attribute = this.trackedAttributes.find(a => a.id == attributeId);
        let targetClasses = event.currentTarget.classList;
        
        if (targetClasses.contains("macro-inc")) {
            attribute.macro_inc = $(event.currentTarget).val();
        } else if (targetClasses.contains("macro-dec")) {
            attribute.macro_dec = $(event.currentTarget).val();
        } else {
            attribute.path = $(event.currentTarget).val();
        }
        
        if (!this.submitting)
            this.render(true);
    }
    
    activateListeners(html) {
        super.activateListeners(html);

        $('button[name="submit"]', html).click(this._onSubmit.bind(this));
        $('button[name="reset"]', html).click(this.resetAttributes.bind(this));

        $('.path-text', html).blur(this.changePath.bind(this));
        $('.remove', html).click(this.removeAttribute.bind(this));
        $('.item-add', html).click(this.addAttribute.bind(this));

        if (this.systemAttributes) {
            let that = this;

            var substringMatcher = function (strs) {
                return function findMatches(q, cb) {
                    var matches, substrRegex;

                    // an array that will be populated with substring matches
                    matches = [];

                    // regex used to determine if a string contains the substring `q`
                    substrRegex = new RegExp(q, 'i');

                    // iterate through the pool of strings and for any string that
                    // contains the substring `q`, add it to the `matches` array
                    $.each(strs, function (i, str) {
                        if (substrRegex.test(str)) {
                            matches.push(str);
                        }
                    });

                    cb(matches);
                };
            };

            $('.path-text', html).typeahead(
                {
                    minLength: 1,
                    hint: true,
                    highlight: true
                },
                {
                    source: substringMatcher(that.systemAttributes)
                }
            );
        }
    }

    _updateObject() {
        AttributeMacroTriggers.log(false, "Saving tracked attributes.", this.trackedAttributes)
        game.settings.set(this.ID, this.SETTINGS.TRACKED_ATTRIBUTES, this.trackedAttributes);
        this.submitting = true;
    }
}

Hooks.on("i18nInit", function() {
    AttributeMacroTriggers.initialize()
});

function checkAttribute(actor, changed, attribute){
    let tracked_stat = attribute.path;
    AttributeMacroTriggers.log(false, "Fetching "+tracked_stat);
    let changed_value = foundry.utils.getProperty(changed, tracked_stat);
    let previous_value = foundry.utils.getProperty(actor, tracked_stat);
    
    if (!changed_value) {
        AttributeMacroTriggers.log(false, "Tracked value was not included in changes.")
        return
    } else if (!previous_value) {
        AttributeMacroTriggers.log(false, "Actor does not have value.")
        return
    } else if (changed_value == previous_value){
        AttributeMacroTriggers.log(false, "Tracked value did not change.")
        return
    } else {
        AttributeMacroTriggers.log(false, "Tracked value changed from ("+previous_value+") to ("+changed_value+")")
        
        let macro_scope = {
            actor: actor,
            token: canvas.tokens.placeables.find(token => token.actor._id == actor._id)
            //TODO There are more attributes to cover in a macro scope
        }
        
        if(previous_value < changed_value){
            AttributeMacroTriggers.log(false, "Tracked value increased!")
            let p_macro = game.macros.get(attribute.macro_inc)
            if(p_macro){
                p_macro.execute(macro_scope);
            } else {
                AttributeMacroTriggers.log(true, "No positive macro registered.")
            }
        } else {
            AttributeMacroTriggers.log(false, "Tracked value decreased!")
            let n_macro = game.macros.get(attribute.macro_dec)
            if(n_macro){
                n_macro.execute(macro_scope);
            } else {
                AttributeMacroTriggers.log(true, "No negative macro registered.")
            }
        }
    }
}

Hooks.on("preUpdateActor", (actor, changed, options, userId) => {
	// Workaround for actor array returned in hook for non triggering clients
	if (game.userId !== userId) return;
    
    let trackedAttributes = game.settings.get(AttributeMacroTriggers.ID, AttributeMacroTriggers.SETTINGS.TRACKED_ATTRIBUTES) ?? [];
    trackedAttributes.forEach(attribute => checkAttribute(actor, changed, attribute));
});