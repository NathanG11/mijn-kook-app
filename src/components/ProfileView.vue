<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient.js'

const profile = ref({
  allergies: 'geen koemelk',
  bereidingstijd: 30,
  apparaten: 'Airfryer, Monsieur Cuisine',
  verdere_toevoegingen: 'een gevarieerd en kindvriendelijk dieet',
  generation_mode: 'Handmatig',
  smaak_dna: null
})
const loading = ref(true)
const analyzing = ref(false)
const notification = ref('')

async function fetchProfile() {
  try {
    loading.value = true
    const { data, error } = await supabase.from('user_profile').select('*').eq('id', 1).single()
    if (error && error.code !== 'PGRST116') throw error // Ignore 'no rows found' error
    if (data) {
      // Zorg ervoor dat alle velden bestaan, zelfs als ze niet in de database staan
      profile.value = { ...profile.value, ...data }
    }
  } catch (error) {
    console.error("Fout bij ophalen profiel:", error)
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  try {
    const profileDataToSave = { ...profile.value };
    delete profileDataToSave.id;
    delete profileDataToSave.created_at;
    delete profileDataToSave.user_id;

    const { error } = await supabase.from('user_profile').update(profileDataToSave).eq('id', 1)
    if (error) throw error
    notification.value = 'Profiel opgeslagen!'
    setTimeout(() => { notification.value = '' }, 2000)
  } catch (error) {
    alert(`Fout bij opslaan: ${error.message}`)
  }
}

async function analyzeProfile() {
  try {
    analyzing.value = true
    notification.value = 'Smaakprofiel wordt geanalyseerd...'
    const { data, error } = await supabase.functions.invoke('analyze-profile')
    if (error) throw error
    if (data.smaak_dna) {
      profile.value.smaak_dna = data.smaak_dna
      await saveProfile() 
      notification.value = 'Smaak-DNA succesvol bijgewerkt!'
       setTimeout(() => { notification.value = '' }, 3000)
    }
  } catch (error) {
    alert(`Fout bij analyseren: ${error.message}`)
     notification.value = ''
  } finally {
    analyzing.value = false
  }
}

onMounted(() => {
  fetchProfile()
})
</script>

<template>
  <div class="profile-view">
    <div v-if="loading">Profiel laden...</div>
    <div v-else>
      <h1>Mijn Culinair Profiel</h1>

      <div class="section">
        <h2>Absolute Voorwaarden</h2>
        <p class="subtitle">De AI-chef zal deze regels altijd strikt volgen.</p>
        <div class="form-group">
          <label for="allergies">Vermijd deze ingrediënten (allergieën):</label>
          <input id="allergies" v-model="profile.allergies" type="text" placeholder="bv. koemelk, noten, schaaldieren">
        </div>
        <div class="form-group">
          <label for="bereidingstijd">Maximale bereidingstijd (in minuten)</label>
          <input id="bereidingstijd" v-model.number="profile.bereidingstijd" type="number" min="5">
        </div>
        <div class="form-group">
          <label for="apparaten">Houd rekening met deze apparaten:</label>
          <input id="apparaten" v-model="profile.apparaten" type="text" placeholder="bv. Airfryer, Blender">
        </div>
      </div>

      <div class="section">
        <h2>Creatieve Input</h2>
        <p class="subtitle">Kies hoe de AI inspiratie opdoet voor nieuwe gerechten.</p>
        <div class="toggle-switch">
          <label>
            <input type="radio" value="Handmatig" v-model="profile.generation_mode">
            <span>Handmatige Input</span>
          </label>
          <label>
            <input type="radio" value="Zelflerend" v-model="profile.generation_mode">
            <span>Geleerd Smaak-DNA</span>
          </label>
        </div>

        <div v-if="profile.generation_mode === 'Handmatig'" class="form-group">
          <label for="verdere_toevoegingen">Verdere toevoegingen:</label>
          <textarea id="verdere_toevoegingen" v-model="profile.verdere_toevoegingen" rows="3" placeholder="bv. deze week zin in Aziatisch, of iets met vis"></textarea>
        </div>

        <div v-if="profile.generation_mode === 'Zelflerend'" class="dna-box">
          <label>Geleerd "Smaak-DNA"</label>
          <div v-if="profile.smaak_dna && profile.smaak_dna.length > 0" class="dna-tags">
            <span v-for="tag in profile.smaak_dna" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <p v-else>Nog geen Smaak-DNA. Beoordeel meer recepten met 4 of 5 sterren en klik hieronder om te analyseren.</p>
          <button @click="analyzeProfile" :disabled="analyzing">{{ analyzing ? 'Analyseren...' : 'Analyseer mijn smaak' }}</button>
        </div>
      </div>

      <button @click="saveProfile" class="save-button">Profiel Opslaan</button>
      <div v-if="notification" class="notification">{{ notification }}</div>
    </div>
  </div>
</template>

<style scoped>
.profile-view { padding: 20px; max-width: 700px; margin: auto; }
.section { background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 30px; }
h2 { margin-top: 0; }
.subtitle { color: #666; margin-top: -10px; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: bold; margin-bottom: 8px; }
.form-group input, .form-group textarea { width: 100%; padding: 12px; font-size: 1rem; border-radius: 4px; border: 1px solid #ccc; box-sizing: border-box; font-family: inherit; }
.save-button { background-color: #2c3e50; color: white; border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 1rem; width: 100%; }
.notification { margin-top: 20px; padding: 10px; background-color: #42b983; color: white; border-radius: 4px; text-align: center; }
.toggle-switch { display: flex; border: 1px solid #ccc; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
.toggle-switch label { flex: 1; text-align: center; padding: 10px; cursor: pointer; background-color: #eee; color: #666; transition: background-color 0.3s; }
.toggle-switch input { display: none; }
.toggle-switch input:checked + span { background-color: #42b983; color: white; }
.dna-box { background-color: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 15px; }
.dna-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px; }
.tag { background-color: #e0e0e0; color: #333; padding: 5px 10px; border-radius: 15px; font-size: 0.9em; }
.dna-box button { font-size: 0.9em; padding: 8px 12px; background-color: #f4f4f4; color: #333; width: auto; border: 1px solid #ccc; cursor: pointer; }
.dna-box button:disabled { background-color: #eee; color: #999; }
</style>