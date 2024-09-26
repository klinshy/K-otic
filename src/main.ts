/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

console.log('Script started successfully');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');
    console.log('Player tags: ',WA.player.tags)

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}
let isAnimating = false;
const soundUrl = "https://cdn.pixabay.com/audio/2022/03/24/audio_81c287eb63.mp3";

// Vereinheitlichte Animationsfunktion (vorwärts und rückwärts)
async function playAnimation(prefix: string, startFrame: number, endFrame: number, delay: number, keepLastFrame: boolean, reverse: boolean = false) {
    const step = reverse ? -1 : 1;
    for (let i = startFrame; reverse ? i >= endFrame : i <= endFrame; i += step) {
        const layerName = `${prefix}/frame${i}`;
        WA.room.showLayer(layerName);
        await new Promise(resolve => setTimeout(resolve, delay));
        if ((reverse && i !== endFrame) || (!reverse && i !== endFrame) || !keepLastFrame) {
            WA.room.hideLayer(layerName);
        }
    }
}

// Optimierte Steuerung der Animation basierend auf dem Betreten und Verlassen der Area
function handleGateAnimation(areaName: string, frameCount: number) {
    const animate = async (enter: boolean) => {
        if (isAnimating) return;
        isAnimating = true;

        // Sound laden und abspielen
        const mySound = WA.sound.loadSound(soundUrl);
        const config = {
            volume: 0.25,
            loop: false,
            rate: 1,
            detune: 1,
            delay: 0,
            seek: 0,
            mute: false
        };
        mySound.play(config);

        if (enter) {
            await playAnimation('gateFG', 1, 6, 500, false);
            await playAnimation('gateBG', 7, frameCount, 500, true);
        } else {
            await playAnimation('gateBG', frameCount, 7, 500, false, true);
            await playAnimation('gateFG', 6, 1, 500, true, true);
        }

        // Sound stoppen
        //mySound.stop();

        isAnimating = false;
    };

    WA.room.area.onEnter(areaName).subscribe(() => animate(true));
    WA.room.area.onLeave(areaName).subscribe(() => animate(false));
}

// Animationen für die Area "openGate" steuern
handleGateAnimation('openGate', 12);
export {}