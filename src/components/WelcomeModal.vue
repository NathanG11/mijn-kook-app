<script setup>
import { defineEmits } from 'vue';

const emit = defineEmits(['close']);
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h2>Welkom bij je Persoonlijke Kook App!</h2>
      <p>Haal het meeste uit je ervaring met deze snelle tips:</p>
      
      <ol class="instructions-list">
        <li>
          <strong>Stel je Profiel in:</strong> Ga naar "Mijn Profiel" om je allergieën en voorkeuren in te vullen. De AI gebruikt dit voor elke suggestie.
        </li>
        <li>
          <strong>Vul je Bibliotheek:</strong> Ga naar "Bibliotheek" en gebruik de 'Voeg...Toe'-knoppen om je eerste recepten te genereren.
        </li>
        <li>
          <strong>Plan je Week:</strong> Ga naar "Weekmenu". Hier wordt automatisch een menu samengesteld uit je bibliotheek. Klik op "Hussel Menu" voor een nieuw voorstel en sla het op via "Sla op & Maak Boodschappenlijst".
        </li>
        <li>
          <strong>Beoordeel & Leer:</strong> Geef gerechten 1-5 sterren op hun detailpagina. Zo leert de app je smaak kennen en worden de suggesties steeds beter.
        </li>
        <li>
          <strong>Word de Fotograaf:</strong> Vervang de standaard-afbeeldingen door je eigen foto's. Upload je creaties op de detailpagina om de app persoonlijk te maken.
        </li>
      </ol>
      
      <button @click="emit('close')" class="close-button">Begrepen, aan de slag!</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}
.modal-content {
  background-color: white;
  padding: 30px 40px;
  border-radius: 10px;
  width: 90%;
  max-width: 650px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.modal-content h2 {
  margin-top: 0;
  color: #2c3e50;
}
.instructions-list {
  padding-left: 20px;
}
.instructions-list li {
  margin-bottom: 15px;
  line-height: 1.6;
}
.close-button {
  display: block;
  width: 100%;
  margin-top: 30px;
  background-color: #42b983;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: bold;
}
</style>