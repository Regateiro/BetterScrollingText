import { BCD_FIELDS, ActorUtils, random } from "./utils.js";
import { BCDSettings } from "./settings.js"

Hooks.on("updateActor", (actor, update, _) => {
	// Render scrolling texts for all BCD updates
	let i = 0;

	if(typeof update.flags?.bcd?.thp?.diff !== 'undefined') {
		const diff = Number(update.flags.bcd.thp.diff.split(".")[1]);
		if (diff !== 0) {
			if (BCDSettings.scrollTextEnabled && BCDSettings.hitPointsEnabled) {
				ActorUtils.displayScrollingText(actor, diff, BCDSettings.tempHitPointsColor, 750 * i);
			}
			i++;
		}
	}

	if(typeof update.flags?.bcd?.hp?.diff !== 'undefined') {
		const diff = Number(update.flags.bcd.hp.diff.split(".")[1]);
		if (diff !== 0) {
			if (BCDSettings.scrollTextEnabled && BCDSettings.hitPointsEnabled) {
				const color = diff <= 0 ? BCDSettings.hitPointsDamageColor : BCDSettings.hitPointsHealingColor;
				ActorUtils.displayScrollingText(actor, diff, color, 750 * i);
			}
			i++;
		}
	}

	if(typeof update.flags?.bcd?.legres?.diff !== 'undefined') {
		const diff = Number(update.flags.bcd.legres.diff.split(".")[1]);
		if (diff !== 0) {
			if (BCDSettings.scrollTextEnabled && BCDSettings.legendaryResistanceEnabled) {
				ActorUtils.displayScrollingText(actor, diff, BCDSettings.legendaryResistanceColor, 750 * i);
			}
			i++;
		}
	}

	return true;
});

// Attach to actor updates
Hooks.on("preUpdateActor", (actor, update, opts) => {
	// Check if this update has already been processed
	if(typeof update.flags?.bcd !== 'undefined') {
		return true;
	}

	// Generate a new random update id to force updates
	const updateID = random();

	// If a supported value was updated, process the change
	const updatedFields = ActorUtils.getUpdatedField(update);
	let hpDiff = null, thpDiff = null, legresDiff = null;
	for (let field of updatedFields) {
		switch(field) {
			case BCD_FIELDS.HP:
				// Calculate the change in HP
				if (typeof opts.dhp !== 'undefined') {
					hpDiff = (opts.dhp + actor.system.attributes.hp.temp);
				} else {
					hpDiff = update.system.attributes.hp.value - actor.system.attributes.hp.value;
				}

				// Check if Fortitude Points are on and whether the HP change would kill the actor
				if(BCDSettings.fortitudePointsEnabled && actor.system.resources?.legres?.value > 0 && actor.system.attributes.hp.value + diff <= 0) {
					hpDiff = 1 - actor.system.attributes.hp.value;
					legresDiff = (diff - hpDiff);

					// If the difference is such that completely exhausts the fortitude points, add the rest to the hpDiff
					if (Math.abs(legresDiff) > actor.system.resources.legres.value) {
						legresDiff = -actor.system.resources.legres.value;
						hpDiff = diff - legresDiff;
					}

					// Update the actor HP and legendary resistance values
					ActorUtils.addActorUpdate(actor, BCD_FIELDS.LEGENDARY_RESISTANCE, Math.max(actor.system.resources.legres.value + legresDiff, 0));
					ActorUtils.addActorUpdate(actor, BCD_FIELDS.HP, Math.max(actor.system.attributes.hp.value + hpDiff, 0));

					// Add the differences to be rendered
					ActorUtils.addActorUpdate(actor, "flags.bcd.legres.diff", updateID.concat(".", legresDiff));
					ActorUtils.addActorUpdate(actor, "flags.bcd.hp.diff", updateID.concat(".", hpDiff));
				} else {
					// If the HP difference would not kill the actor, simply add the HP difference to be rendered
					ActorUtils.addActorUpdate(actor, "flags.bcd.hp.diff", updateID.concat(".", hpDiff));
				}
				break;
			case BCD_FIELDS.TEMP_HP:
				// Calculate the temporary HP difference	
				thpDiff = update.system.attributes.hp.temp - actor.system.attributes.hp.temp;

				// Add the difference to be rendered
				ActorUtils.addActorUpdate(actor, "flags.bcd.thp.diff", updateID.concat(".", thpDiff));
				break;
			case BCD_FIELDS.LEGENDARY_RESISTANCE:
				// Calculate the legendary resistance difference	
				legresDiff = update.system.resources.legres.value - actor.system.resources.legres.value;

				// Add the difference to be rendered
				ActorUtils.addActorUpdate(actor, "flags.bcd.legres.diff", updateID.concat(".", legresDiff));
				break;
			default:
				// Do nothing if a non supported field is updated
				break;
		}
	}

	// Issue an actor update with the changes and differences to be rendered
	ActorUtils.updateActor(actor);
	return true;
});

Hooks.once("init", () => {
	// Init the settings
	BCDSettings.init();
	// Disable the normal scrolling text
	libWrapper.register("bettercombatdamage", "CONFIG.Actor.documentClass.prototype._displayScrollingDamage", (_) => {}, "OVERRIDE", {chain: true});
});