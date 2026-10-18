let previous=false;
export function reportGameplay(playing){
 const sdk=globalThis.primalSDK;if(!sdk||playing===previous)return;previous=playing;
 try{Promise.resolve(sdk.game[playing?'gameplayStart':'gameplayStop']()).catch(error=>console.warn('CrazyGames gameplay event:',error));}catch(error){console.warn('CrazyGames gameplay event:',error);}
}
