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
            combatants.forEach((cbt) => {
                const group = cbt.getFlag(game.system.id, "group");
                groups[group] = { present: true, name: group };
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
            }
            combat.setFlag(CANONICAL_NAME, 'groups', sortedGroups)
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
                        return combatant.getFlag(game.system.id, 'declareSpells')
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
                        return combatant.getFlag(game.system.id, 'declareSpells')
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
