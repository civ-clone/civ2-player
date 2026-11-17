/** A civil war needs the loser to be a computer player (not the barbarians): a person's civilization never splits. */
export declare const CIVIL_WAR_COMPUTER_RULE =
  'civ2-player:city/captured/civil-war/computer';
/** A civil war needs the city taken to be the loser's capital (its Palace). */
export declare const CIVIL_WAR_CAPITAL_RULE =
  'civ2-player:city/captured/civil-war/capital';
/** A civil war needs the loser to have had more than 4 cities, the one taken included. */
export declare const CIVIL_WAR_CITIES_RULE =
  'civ2-player:city/captured/civil-war/cities';
/** A civil war needs the captor (or, for a computer captor, the weakest person) to rank below the loser. */
export declare const CIVIL_WAR_WEAKER_RULE =
  'civ2-player:city/captured/civil-war/weaker';
/** The capital's land mass stays loyal; others go whole, or else the farthest cities until they hold a third. */
export declare const REBEL_CITIES_RULE = 'civ2-player:civil-war/rebel-cities';
/** Splitting the capital's player when its Palace city is taken and the `CivilWar` rules agree. */
export declare const CIVIL_WAR_RULE = 'civ2-player:city/captured/civil-war';
