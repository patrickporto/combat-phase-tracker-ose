import { CANONICAL_NAME } from "./constants.js";
import "./combat-phase-tracker-ose.css"

Hooks.on(`init`, () => {
    game.ose.oseCombat.rollInitiative = () => { }
    game.ose.oseCombat.addContextEntry = () => { }
});

Hooks.on(`combat-phase-tracker.init`, async ({ combatTrackerPhases }) => {
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.DeclareSpellsAndRetreats',
        cssClass: 'ose-declare-spells-and-retreats',
    })
    combatTrackerPhases.add({
        name: 'COMBATPHASETRACKEROSE.Initiative',
        cssClass: 'ose-initiative',
        getCombatants(combat) {
            const initiative = game.settings.get(game.system.id, "initiative");
            if (initiative === 'group') {
                return []
            }
            return combat.combatants.filter(combatant => {
                const actorData = combatant.actor?.system;
                return !actorData.isSlow
            })
        },
        async onActivate({ combat, createPlaceholder, phases }) {
            phases.removePhasesByScope('round')
            const initiative = game.settings.get(game.system.id, "initiative");
            const reroll = game.settings.get(game.system.id, "rerollInitiative");
            if (initiative !== 'group') {
                return
            }
            const groups = {};
            const slow = {
                prepareSpell: [],
                combatants: []
            }
            const combatants = combat?.combatants;
            for (const combatant of combatants) {
                if (combatant.defeated) {
                    continue;
                }
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
            const lastRoundGroups = combat.getFlag(CANONICAL_NAME, 'groups')
            for (const group in groups) {
                const lastInitiative = lastRoundGroups?.[group]?.initiative ?? null
                if (lastInitiative === null || reroll !== 'keep') {
                    const roll = new Roll("1d6").evaluate({ async: false });
                    await roll.toMessage({
                        flavor: game.i18n.format("OSE.roll.initiative", {
                            group: CONFIG.OSE.colors[group],
                        }),
                    });
                    groups[group].initiative = roll.total;
                } else {
                    groups[group].initiative = lastInitiative
                }
            }
            await combat.setFlag(CANONICAL_NAME, 'groups', groups)

            const sortedGroups = Object.values(groups).sort((a, b) => {
                return a.initiative - b.initiative;
            })
            for (const group of sortedGroups) {
                createPlaceholder({
                    name: CONFIG.OSE.colors[group.name],
                    initiative: group.initiative,
                    hasRolled: true,
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
                                return belongsToGroup && isPreparingSpell && !isSlow && !combatant.defeated
                            })
                        },
                    })
                }
                subPhases.push({
                    name: 'COMBATPHASETRACKEROSE.MeleeAttacks',
                    cssClass: 'ose-melee-attacks',
                })
                combatTrackerPhases.add({
                    name: CONFIG.OSE.colors[group.name],
                    cssClass: `ose-acts ${group.name}`,
                    scope: 'round',
                    getCombatants(combat) {
                        return combat.combatants.filter(combatant => {
                            const belongsToGroup = combatant.getFlag(game.system.id, 'group') === group.name
                            const isSlow = slow.combatants.includes(combatant.id)
                            return belongsToGroup && !isSlow && !combatant.defeated
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
                                return isPreparingSpell && isSlow && !combatant.defeated
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
        }
    })
});
