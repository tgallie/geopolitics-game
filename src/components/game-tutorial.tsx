"use client";

import { useRef } from "react";

export function GameTutorial({ onOpen }: { onOpen: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return <>
    <button type="button" className="tutorial-button" onClick={() => {
      // pause the opponents while i read the instructions
      onOpen();
      dialog.current?.showModal();
    }}>How to play</button>
    <dialog ref={dialog} className="tutorial-dialog" aria-labelledby="tutorial-title">
      <div className="tutorial-heading">
        <h2 id="tutorial-title">How to play</h2>
        <button type="button" onClick={() => dialog.current?.close()} autoFocus>Close tutorial</button>
      </div>
      <p>Conquer all 10 countries to win. You play against nine computer-controlled opponents (NPCs). Opening this guide pauses automatic NPC playback. Close it and press Play NPC turns when you are ready to continue.</p>
      <h3>Your first game: step by step</h3>
      <ol>
        <li><strong>Pick a country.</strong> Search or filter the 32 available countries, select one, then press Start game. Nine different opponents and the turn order are chosen randomly.</li>
        <li><strong>Wait for your turn.</strong> Use Next NPC move to watch one decision, or Play NPC turns to continue automatically. Speed changes the pace; Pause stops playback. Playback stops when your turn starts.</li>
        <li><strong>Choose your move.</strong> Select Your country, then Target country. A map marker also selects your country or an enemy target. Choose Attack to fight, or End turn to skip attacking.</li>
        <li><strong>Roll during combat.</strong> Press Roll dice for each combat phase. Watch the dice and losses in Latest moves. Stop attack ends your turn with your surviving soldiers.</li>
        <li><strong>Occupy after a capture.</strong> Enter Soldiers to move and press Occupy country. Leave at least one soldier in the source. Your turn ends after occupation, unless this wins the game.</li>
      </ol>
      <details open><summary>Turns and reinforcements</summary>
        <p>You can start one attack per turn, with multiple dice phases during that attack. Countries do not need to be neighbours. You may skip attacking.</p>
        <p>There are no reinforcements in round one. From round two, each turn gives you 2 soldiers per country you control. For example, three countries give six new soldiers. Use Your country, Soldiers and Place soldiers to distribute them. You must place all reinforcements before attacking or transferring.</p>
      </details>
      <details><summary>Exactly how dice and casualties work</summary>
        <p>You need at least two soldiers to attack. One must stay behind. Each side rolls the same number of dice: the smaller of the attacking soldiers minus one and the defending soldiers. Each die is a random number from 1 to 6.</p>
        <p>Dice are paired in their original order. The lower die loses one soldier; a tie causes no loss. There is no three-dice limit.</p>
        <p><strong>Example:</strong> 10 attackers against 2 defenders means two dice each. Attacker rolls 1 and 4; defender rolls 2 and 3. Both lose one soldier, leaving 9 attackers and 1 defender. You can roll again or stop.</p>
        <p>If the defenders reach zero, you capture their country. If your attacking army reaches one soldier, the attack and your turn end. You keep your original territory.</p>
      </details>
      <details><summary>Captures, transfers and winning</summary>
        <p>A capture grants the greater of 2 soldiers or half the captured country’s original soldier value, rounded down. A value of 9 grants 4 soldiers; a value of 3 grants 2. The bonus joins your attacking country before you choose how many soldiers to move into the captured country.</p>
        <p>To transfer outside combat, choose two different countries you own, enter a positive whole number in Soldiers, then press Transfer soldiers. Keep at least one in the source. Transfers are available after you finish placing reinforcements.</p>
        <p>A player with no countries is eliminated and receives no more turns. You win when you control and occupy all ten countries. If you are eliminated, you can keep watching NPC moves.</p>
      </details>
      <details><summary>Starting soldiers and population</summary>
        <p>Starting armies use the country’s 2026 population estimate. Each upper limit below is inclusive.</p>
        <table><thead><tr><th>Population</th><th>Soldiers</th></tr></thead><tbody>
          {["Up to 5 million", "Over 5 to 10 million", "Over 10 to 25 million", "Over 25 to 50 million", "Over 50 to 75 million", "Over 75 to 100 million", "Over 100 to 125 million", "Over 125 to 150 million", "Over 150 million"].map((range, index) => <tr key={range}><td>{range}</td><td>{index + 1}</td></tr>)}
        </tbody></table>
      </details>
      <details><summary>Reading the map and opponent decisions</summary>
        <p>The numbered square markers show soldiers. Blue markers belong to you; other marker colours identify NPC owners. Yellow borders indicate your selected source or target. The background artwork keeps its original colours, so use markers and the country list to check ownership.</p>
        <p>Attack routes and capture flashes show conflict locations. Latest moves records dice, losses, captures and NPC explanations. Opponents look for favourable attacks, reinforce strong armies, combine troops when useful, and may stop or skip an unfavourable fight.</p>
      </details>
      <p className="tutorial-note">Games currently run in this browser page. Refreshing or closing the page resets the game; saving and accounts are not available yet.</p>
    </dialog>
  </>;
}
