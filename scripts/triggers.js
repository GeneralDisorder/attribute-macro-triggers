class AttributeMacroTriggers {
    static ID = 'attribute-macro-triggers';
    static enableLogs = true;
    
    static SETTINGS = {
        TRACKED_STAT: "tracked_stat",
        POSITIVE_MACRO: "positive_macro",
        NEGATIVE_MACRO: "negative_macro"
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
    }
}

Hooks.on("i18nInit", function() {
    AttributeMacroTriggers.initialize()
});

Hooks.on("preUpdateActor", (actor, changed, options, userId) => {
	// Workaround for actor array returned in hook for non triggering clients
	if (game.userId !== userId) return;
	// AttributeMacroTriggers.log(false, "Trigger Info:")
    // AttributeMacroTriggers.log(false, actor)
    // AttributeMacroTriggers.log(false, changed)
    // AttributeMacroTriggers.log(false, options)
    
    let tracked_stat = game.settings.get(AttributeMacroTriggers.ID, AttributeMacroTriggers.SETTINGS.TRACKED_STAT)
    AttributeMacroTriggers.log(false, "Fetching "+tracked_stat)
    let changed_value = foundry.utils.getProperty(changed, tracked_stat)
    let previous_value = foundry.utils.getProperty(actor, tracked_stat)
    
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
            //TODO This is not complete
        }
        
        if(previous_value < changed_value){
            AttributeMacroTriggers.log(false, "Tracked value increased!")
            let p_macro_id = game.settings.get(AttributeMacroTriggers.ID, AttributeMacroTriggers.SETTINGS.POSITIVE_MACRO)
            let p_macro = game.macros.get(p_macro_id)
            if(p_macro){
                p_macro.execute(macro_scope);
            } else {
                AttributeMacroTriggers.log(true, "No positive macro registered.")
            }
        } else {
            AttributeMacroTriggers.log(false, "Tracked value decreased!")
            let n_macro_id = game.settings.get(AttributeMacroTriggers.ID, AttributeMacroTriggers.SETTINGS.NEGATIVE_MACRO)
            let n_macro = game.macros.get(n_macro_id)
            if(n_macro){
                n_macro.execute(macro_scope);
            } else {
                AttributeMacroTriggers.log(true, "No negative macro registered.")
            }
        }
    }
    
});