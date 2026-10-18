// Calibration multipliers. Medium preserves the previous campaign balance.
export const DIFFICULTIES={
 easy:{name:'Fácil',playerCost:.9,enemyIncome:.8,enemyCost:1.1,enemySpawn:1.2,enemyCadence:1.2,description:'Suas tropas custam menos; o rival recruta mais devagar.'},
 medium:{name:'Médio',playerCost:1,enemyIncome:1,enemyCost:1,enemySpawn:1,enemyCadence:1,description:'Custos e ritmo originais da campanha.'},
 hard:{name:'Difícil',playerCost:1.1,enemyIncome:1.12,enemyCost:.95,enemySpawn:.85,enemyCadence:.85,description:'Tropas mais caras e rival com renda e produção maiores.'},
 insane:{name:'Insana',playerCost:1.2,enemyIncome:1.25,enemyCost:.85,enemySpawn:.7,enemyCadence:.7,description:'Pressão intensa: rival rico, barato e rápido. Experimental.'}
};
export function difficultyFor(key){return Object.hasOwn(DIFFICULTIES,key)?DIFFICULTIES[key]:DIFFICULTIES.medium;}
