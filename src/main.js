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
        showPlaceholders: true,
        async onActivate({ combat, createPlaceholder }) {
            const groups = {};
            const combatants = combat?.combatants;
            combatants.forEach((combatant) => {
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
            });
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
                            return combat.combatants.filter(c => c.getFlag(game.system.id, 'group') === group.name && c.getFlag(game.system.id, 'prepareSpell'))
                        },
                    })
                }
                subPhases.push({
                    name: 'COMBATPHASETRACKEROSE.MeleeAttacks',
                    cssClass: 'ose-melee-attacks',
                })
                combatTrackerPhases.add({
                    name: group.name,
                    cssClass: 'ose-winning-acts',
                    scope: 'round',
                    getCombatants(combat) {
                        return combat.combatants.filter(c => c.getFlag(game.system.id, 'group') === group.name)
                    },
                    subPhases,
                })
            }
            combat.setFlag(CANONICAL_NAME, 'groups', sortedGroups)
        }
    })
});
