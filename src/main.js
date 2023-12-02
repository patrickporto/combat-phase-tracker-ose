import { MODULE_NAME } from "./constants.js";
import "./combat-phase-tracker-ose.css"


Hooks.on(`combat-phase-tracker.init`, async ({ combatTrackerPhases }) => {
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.DeclareSpellsAndRetreats',
        cssClass: 'ose-declare-spells-and-retreats',
        controls: [
            {
                content: '<i class="fas fa-magic">',
                tooltip: 'Declare Spells',
                async onClick({ combatant, addCombatantCssClass, removeCombatantCssClass }) {
                    const declareSpells = combatant.getFlag(CANONICAL_NAME, 'declareSpells')
                    const newDeclareSpells = !declareSpells
                    await combatant.setFlag(CANONICAL_NAME, 'declareSpells', newDeclareSpells)
                    if (newDeclareSpells) {
                        addCombatantCssClass(combatant.id, 'declare-spells')
                    } else {
                        removeCombatantCssClass(combatant.id, 'declare-spells')
                    }
                },
                async onActivate({ combat, removeCombatantCssClass }) {
                    for (const combatant of combat.combatants) {
                        await combatant.setFlag(CANONICAL_NAME, 'declareSpells', false)
                        removeCombatantCssClass(combatant.id, 'declare-spells')
                    }
                }
            }
        ]
    })
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.Initiative',
        cssClass: 'ose-initiative',
        showPlaceholders: true,
        async onActivate({ combat, createPlaceholder }) {
            let friendly = new Roll('1d6')
            let hostile = new Roll('1d6')
            await Promise.all([
                friendly.roll(),
                hostile.roll()
            ])
            while (friendly.total === hostile.total) {
                friendly = new Roll('1d6')
                hostile = new Roll('1d6')
                await Promise.all([
                    friendly.roll(),
                    hostile.roll()
                ])
            }
            combat.setFlag(CANONICAL_NAME, 'initiative', {
                friendly: friendly.total,
                hostile: hostile.total,
            })
            await Promise.all([
                friendly.toMessage({
                    flavor: 'Friendly Initiative'
                }),
                hostile.toMessage({
                    flavor: 'Hostile Initiative'
                }),
            ])
            createPlaceholder({
                name: 'Friendly',
                details: friendly.total,
                cssClass: 'ose-friendly-initiative',
            })
            createPlaceholder({
                name: 'Hostile',
                details: hostile.total,
                cssClass: 'ose-hostile-initiative',
            })
        }
    })
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.WinningActs',
        cssClass: 'ose-winning-acts',
        getCombatants(combat) {
            const initiative = combat.getFlag(CANONICAL_NAME, 'initiative')
            if (!initiative) {
                return []
            }
            const winner = initiative.friendly > initiative.hostile ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : CONST.TOKEN_DISPOSITIONS.HOSTILE

            return combat.combatants.filter(c => c.token.disposition === winner)
        },
        subPhases: [
            {
                name: 'COMBATPHASETRACKEROSE.Movement',
                cssClass: 'ose-movement',
            },
            {
                name: 'COMBATPHASETRACKEROSE.MissileAttacks',
                cssClass: 'ose-missile-attacks',
            },
            {
                name: 'COMBATPHASETRACKEROSE.SpellCasting',
                cssClass: 'ose-spell-casting',
                autoSkip({ combatants, combat }) {
                    const hasSpellCasting = Object.values(combatants).some(({ id }) => {
                        const combatant = combat.combatants.get(id)
                        return combatant.getFlag(CANONICAL_NAME, 'declareSpells')
                    })
                    return !hasSpellCasting
                },
            },
            {
                name: 'COMBATPHASETRACKEROSE.MeleeAttacks',
                cssClass: 'ose-melee-attacks',
            }
        ]
    })
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.OtherSidesAct',
        cssClass: 'ose-winning-acts',
        getCombatants(combat) {
            const initiative = combat.getFlag(CANONICAL_NAME, 'initiative')
            if (!initiative) {
                return []
            }
            const winner = initiative.friendly > initiative.hostile ? CONST.TOKEN_DISPOSITIONS.FRIENDLY : CONST.TOKEN_DISPOSITIONS.HOSTILE

            return combat.combatants.filter(c => c.token.disposition !== winner)
        },
        subPhases: [
            {
                name: 'COMBATPHASETRACKEROSE.Movement',
                cssClass: 'ose-movement',
            },
            {
                name: 'COMBATPHASETRACKEROSE.MissileAttacks',
                cssClass: 'ose-missile-attacks',
            },
            {
                name: 'COMBATPHASETRACKEROSE.SpellCasting',
                cssClass: 'ose-spell-casting',
                autoSkip({ combatants, combat }) {
                    const hasSpellCasting = Object.values(combatants).some(({ id }) => {
                        const combatant = combat.combatants.get(id)
                        return combatant.getFlag(CANONICAL_NAME, 'declareSpells')
                    })
                    return !hasSpellCasting
                },
            },
            {
                name: 'COMBATPHASETRACKEROSE.MeleeAttacks',
                cssClass: 'ose-melee-attacks',
            }
        ]
    })
});
