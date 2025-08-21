<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router' // useRouter is nieuw
import { supabase } from '../supabaseClient.js'

const route = useRoute()
const router = useRouter() // Nieuw voor de terug-knop
const recipeId = route.params.id

const recipe = ref(null)
const loading = ref(true)
const userRating = ref(0)
const notificationMessage = ref('')
const isUploading = ref(false)

const formattedInstructions = computed(() => {
  if (recipe.value && recipe.value.instructies) {
    return recipe.value.instructies.replace(/\\n/g, '<br>').replace(/\n/g, '<br>')
  }
  return ''
})

function getImageUrl(gerecht) {
  if (gerecht && gerecht.foto_url) return gerecht.foto_url;
  const naam = gerecht?.naam || 'Recept';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(naam)}&background=random&color=fff&size=256`;
}

async function fetchRecipe() {
  try {
    loading.value = true
    const { data, error } = await supabase.from('gerechten').select('*').eq('id', recipeId).single()
    if (error) throw error
    recipe.value = data
  } catch (error) {
    console.error('Fout bij ophalen recept:', error.message)
  } finally {
    loading.value = false
  }
}

async function handlePhotoUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  try {
    isUploading.value = true
    notificationMessage.value = 'Foto wordt geüpload...'
    const fileName = `${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('gerecht-fotos').upload(fileName, file)
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from('gerecht-fotos').getPublicUrl(fileName)
    const newPhotoUrl = urlData.publicUrl
    const { error: updateError } = await supabase.from('gerechten').update({ foto_url: newPhotoUrl }).eq('id', recipeId)
    if (updateError) throw updateError
    recipe.value.foto_url = newPhotoUrl
    notificationMessage.value = 'Foto succesvol bijgewerkt!'
  } catch (error) {
    notificationMessage.value = `Oeps, er ging iets mis met de upload: ${error.message}`
  } finally {
    isUploading.value = false
    setTimeout(() => { notificationMessage.value = '' }, 4000)
  }
}

function triggerFileInput() {
  document.getElementById('file-input').click()
}

async function submitRating(rating) {
  userRating.value = rating
  try {
    const huidigeBeoordelingen = recipe.value.beoordelingen || []
    const nieuweBeoordelingen = [...huidigeBeoordelingen, rating]
    const gemiddelde = nieuweBeoordelingen.reduce((a, b) => a + b, 0) / nieuweBeoordelingen.length;
    let newFrequency = 'Normaal';
    if (gemiddelde >= 4) newFrequency = 'Hoog';
    else if (gemiddelde >= 3) newFrequency = 'Laag';
    else newFrequency = 'Gearchiveerd';
    const { error } = await supabase.from('gerechten').update({ beoordelingen: nieuweBeoordelingen, frequentie: newFrequency }).eq('id', recipeId)
    if (error) throw error
    recipe.value.beoordelingen = nieuweBeoordelingen
    recipe.value.frequentie = newFrequency
    notificationMessage.value = `Bedankt! Nieuwe status: ${newFrequency}`
    setTimeout(() => { notificationMessage.value = '' }, 3000)
  } catch (error) {
    notificationMessage.value = 'Oeps, er ging iets mis bij het opslaan.'
     setTimeout(() => { notificationMessage.value = '' }, 3000)
  }
}

onMounted(() => {
  fetchRecipe()
})
</script>

<template>
  <div class="recipe-detail">
    <div v-if="notificationMessage" class="notification">
      {{ notificationMessage }}
    </div>
    <div v-if="loading">Recept aan het laden...</div>
    <div v-else-if="recipe">
      <img :src="getImageUrl(recipe)" :alt="recipe.naam" class="main-photo">
      <h1>{{ recipe.naam }}</h1>

      <div class="info-bar">
        <div v-if="recipe.bereidingstijd" class="info-item">
          <strong>Tijd:</strong> {{ recipe.bereidingstijd }}
        </div>
        <div v-if="recipe.maaltijd_type" class="info-item">
          <strong>Type:</strong> {{ recipe.maaltijd_type }}
        </div>
      </div>
      <p v-if="recipe.omschrijving" class="description">{{ recipe.omschrijving }}</p>
      
      <div class="upload-box content-box">
        <h2>Jouw Foto</h2>
        <p>Vervang de placeholder met je eigen meesterwerk!</p>
        <button @click="triggerFileInput" :disabled="isUploading">
          {{ isUploading ? 'Bezig met uploaden...' : 'Upload Eigen Foto' }}
        </button>
        <input type="file" id="file-input" @change="handlePhotoUpload" accept="image/*" style="display: none;">
      </div>
      <div class="rating-box content-box">
        <h2>Geef je beoordeling</h2>
        <div class="stars">
          <span v-for="star in 5" :key="star" class="star" :class="{ 'filled': star <= userRating }" @click="submitRating(star)">★</span>
        </div>
        <p v-if="recipe.beoordelingen && recipe.beoordelingen.length">
          Gemiddelde score: {{ (recipe.beoordelingen.reduce((a, b) => a + b, 0) / recipe.beoordelingen.length).toFixed(1) }}
          <br>
          <small>Status: {{ recipe.frequentie }}</small>
        </p>
      </div>
       <div v-if="recipe.ingredienten && recipe.ingredienten.length" class="content-box">
        <h2>Ingrediënten</h2>
        <ul class="ingredients-list">
          <li v-for="(item, index) in recipe.ingredienten" :key="index">
            <span class="ingredient-name">{{ item.naam }}</span>
            <span class="ingredient-quantity">{{ item.hoeveelheid }}</span>
          </li>
        </ul>
      </div>
      <div class="content-box">
        <h2>Instructies</h2>
        <p class="recipe-instructions" v-html="formattedInstructions"></p>
      </div>
      <div class="content-box tip-box">
        <h2>Kind Tip</h2>
        <p>{{ recipe.kind_tip }}</p>
      </div>
    </div>
    <div v-else><p>Oeps! Kon dit recept niet vinden.</p></div>
    <button @click="router.back()" class="back-link">← Terug naar vorig scherm</button>
  </div>
</template>

<style scoped>
.recipe-detail { padding: 20px; font-family: sans-serif; max-width: 800px; margin: 0 auto; position: relative; }
.content-box { border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-top: 20px; }
.tip-box { background-color: #eef7ff; border-color: #b3d7ff; }
.back-link { display: inline-block; margin-top: 30px; color: #2c3e50; font-weight: bold; background: none; border: none; font-size: 1em; cursor: pointer; padding: 0; }
p { line-height: 1.6; }
.recipe-instructions { white-space: pre-wrap; }
.rating-box { background-color: #fffbe6; border-color: #ffe580; }
.stars { font-size: 2.5rem; cursor: pointer; }
.star { color: #ccc; }
.star.filled { color: #ffc107; }
.notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #28a745; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; font-size: 1.1rem; }
.main-photo { width: 100%; height: 350px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }
.upload-box button { background-color: #2c3e50; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-size: 1rem; }
.upload-box button:disabled { background-color: #ccc; cursor: not-allowed; }
.ingredients-list { list-style: none; padding: 0; }
.ingredients-list li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
.ingredients-list li:last-child { border-bottom: none; }
.ingredient-name { font-weight: 500; }
.info-bar { display: flex; gap: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; flex-wrap: wrap; }
.info-item { font-size: 1rem; color: #333; }
.description { font-style: italic; color: #555; margin-bottom: 20px; line-height: 1.6; }
</style>