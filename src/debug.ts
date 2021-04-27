export let debugMode = false;

export function debugInfo(...args: any[]) {
  if (debugMode) {
    console.log(args.join(", "));
  }
}

export function toggleDebugMode(){
  if (debugMode) {
    debugMode = false;
  } else {
    debugMode = true;
  }
}