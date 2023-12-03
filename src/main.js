import { CANONICAL_NAME } from "./constants.js";
import "./combat-phase-tracker-ose.css"

Hooks.on(`init`, () => {
    game.ose.oseCombat.rollInitiative = () => { }
});

Hooks.on(`combat-phase-tracker.init`, async ({ combatTrackerPhases }) => {
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.DeclareSpellsAndRetreats',
        cssClass: 'ose-declare-spells-and-retreats',
    })
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.Initiative',
        cssClass: 'ose-initiative',
        getCombatants() {
            return []
        },
        async onActivate({ combat, createPlaceholder }) {
            const groups = {};
            const slow = {
                prepareSpell: [],
                combatants: []
            }
            const combatants = combat?.combatants;
            for (const combatant of combatants) {
                const actorData = combatant.actor?.system;
                if (actorData.isSlow) {
                    if (combatant.getFlag(game.system.id, "prepareSpell")) {
                        slow.prepareSpell.push(combatant);
                    }
                    slow.combatants.push(combatant.id);
                    continue;
                }
                const groupColor = combatant.getFlag(game.system.id, "group");
                let group = groups[groupColor];
                if (!group) {
                    groups[groupColor] = {
                        name: groupColor,
                        prepareSpell: []
                    };
                    group = groups[groupColor];
                }
                const prepareSpell = combatant.getFlag(game.system.id, "prepareSpell")
                if (prepareSpell) {
                    group.prepareSpell.push(combatant);
                }
            };
            // Roll init
            for (const group in groups) {
                const roll = new Roll("1d6").evaluate({ async: false });
                await roll.toMessage({
                    flavor: game.i18n.format("OSE.roll.initiative", {
                        group: CONFIG.OSE.colors[group],
                    }),
                });
                groups[group].initiative = roll.total;
            }

            const sortedGroups = Object.values(groups).sort((a, b) => {
                return a.initiative - b.initiative;
            })
            for (const group of sortedGroups) {
                createPlaceholder({
                    name: group.name,
                    details: group.initiative,
                    cssClass: `ose-${group.name}-initiative`,
                });
                const subPhases = [
                    {
                        name: 'COMBATPHASETRACKEROSE.Movement',
                        cssClass: 'ose-movement',
                    },
                    {
                        name: 'COMBATPHASETRACKEROSE.MissileAttacks',
                        cssClass: 'ose-missile-attacks',
                    },
                ]
                if (group.prepareSpell.length > 0) {
                    subPhases.push({
                        name: 'COMBATPHASETRACKEROSE.SpellCasting',
                        cssClass: 'ose-spell-casting',
                        getCombatants(combat) {
                            return combat.combatants.filter(combatant => {
                                const belongsToGroup = combatant.getFlag(game.system.id, 'group') === group.name
                                const isPreparingSpell = combatant.getFlag(game.system.id, 'prepareSpell')
                                const isSlow = slow.combatants.includes(combatant.id)
                                return belongsToGroup && isPreparingSpell && !isSlow
                            })
                        },
                    })
                }
                subPhases.push({
                    name: 'COMBATPHASETRACKEROSE.MeleeAttacks',
                    cssClass: 'ose-melee-attacks',
                })
                combatTrackerPhases.add({
                    name: group.name,
                    cssClass: `ose-acts ${group.name}`,
                    scope: 'round',
                    getCombatants(combat) {
                        return combat.combatants.filter(combatant => {
                            const belongsToGroup = combatant.getFlag(game.system.id, 'group') === group.name
                            const isSlow = slow.combatants.includes(combatant.id)
                            return belongsToGroup && !isSlow
                        })
                    },
                    subPhases,
                })
            }
            if (slow.combatants.length > 0) {
                const slowSubPhases = [
                    {
                        name: 'COMBATPHASETRACKEROSE.Movement',
                        cssClass: 'ose-movement',
                    },
                    {
                        name: 'COMBATPHASETRACKEROSE.MissileAttacks',
                        cssClass: 'ose-missile-attacks',
                    },
                ]
                if (slow.prepareSpell.length > 0) {
                    slowSubPhases.push({
                        name: 'COMBATPHASETRACKEROSE.SpellCasting',
                        cssClass: 'ose-spell-casting',
                        getCombatants(combat) {
                            return combat.combatants.filter(combatant => {
                                const isPreparingSpell = combatant.getFlag(game.system.id, 'prepareSpell')
                                const isSlow = slow.combatants.includes(combatant.id)
                                return isPreparingSpell && isSlow
                            })
                        },
                    })
                }
                slowSubPhases.push({
                    name: 'COMBATPHASETRACKEROSE.MeleeAttacks',
                    cssClass: 'ose-melee-attacks',
                })
                combatTrackerPhases.add({
                    name: 'COMBATPHASETRACKEROSE.Slow',
                    cssClass: `ose-acts slow`,
                    scope: 'round',
                    getCombatants(combat) {
                        return combat.combatants.filter(combatant => {
                            const isSlow = slow.combatants.includes(combatant.id)
                            return isSlow
                        })
                    },
                    subPhases: slowSubPhases,
                })
            }
            combat.setFlag(CANONICAL_NAME, 'groups', sortedGroups)
        }
    })
});
