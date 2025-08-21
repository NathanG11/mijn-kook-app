<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase } from '../supabaseClient.js'

const recipes = ref([])
const loading = ref(true)
const errorMessage = ref('')
const isFindingNewRecipes = ref(false)
const isImporting = ref(false)
const urlToImport = ref('')
let recipeChannel = null

const recipeForConfirmation = ref(null)
const notificationMessage = ref('')

function calculateAverageRating(beoordelingen) { if (!beoordelingen || beoordelingen.length === 0) return 0; const sum = beoordelingen.reduce((a, b) => a + b, 0); return sum / beoordelingen.length; }
const libraryBreakdown = computed(() => ({ totaal: recipes.value.length, ontbijt: recipes.value.filter(g => g.maaltijd_type === 'ontbijt').length, lunch: recipes.value.filter(g => g.maaltijd_type === 'lunch').length, avondmaal: recipes.value.filter(g => g.maaltijd_type === 'avondmaal').length, }));
const groupedAndSortedRecipes = computed(() => { const recipesWithAvgRating = recipes.value.map(recipe => ({ ...recipe, avgRating: calculateAverageRating(recipe.beoordelingen) })); const grouped = { ontbijt: recipesWithAvgRating.filter(r => r.maaltijd_type === 'ontbijt'), lunch: recipesWithAvgRating.filter(r => r.maaltijd_type === 'lunch'), avondmaal: recipesWithAvgRating.filter(r => r.maaltijd_type === 'avondmaal'), }; for (const category in grouped) { grouped[category].sort((a, b) => b.avgRating - a.avgRating); } return grouped; });
const formattedInstructions = computed(() => { if (recipeForConfirmation.value && recipeForConfirmation.value.instructies) { return recipeForConfirmation.value.instructies.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') } return '' });

async function fetchAllRecipes() { try { loading.value = true; errorMessage.value = ''; const { data, error } = await supabase.from('gerechten').select('*').order('created_at', { ascending: false }); if (error) throw error; recipes.value = data } catch (error) { errorMessage.value = `Fout bij ophalen bibliotheek: ${error.message}` } finally { loading.value = false } }

async function findNewRecipe(mealType) {
  try {
    isFindingNewRecipes.value = true;
    errorMessage.value = '';
    const { data: userProfile } = await supabase.from('user_profile').select('*').eq('id', 1).single();
    const excludedRecipes = recipes.value.map(r => r.naam);
    const { data: newRecipe, error } = await supabase.functions.invoke('generate-single-recipe', { body: { userProfile, mealType, excludedRecipes } });
    if (error) throw error;
    if (newRecipe.error) throw new Error(newRecipe.error);
    recipeForConfirmation.value = newRecipe;
  } catch (error) {
    errorMessage.value = `Fout bij vinden van nieuw recept: ${error.message}`
  } finally {
    isFindingNewRecipes.value = false
  }
}

async function importFromUrl() {
  if (!urlToImport.value.trim()) return alert("Voer een geldige URL in.");
  try {
    isImporting.value = true;
    errorMessage.value = '';
    const { data: userProfile } = await supabase.from('user_profile').select('*').eq('id', 1).single();
    const { data: newRecipe, error } = await supabase.functions.invoke('import-from-url', { body: { url: urlToImport.value, userProfile } });
    if (error) throw error;
    if (newRecipe.error) throw new Error(newRecipe.error);
    recipeForConfirmation.value = newRecipe;
    urlToImport.value = '';
  } catch (error) {
    errorMessage.value = `Fout bij importeren: ${error.message}`;
  } finally {
    isImporting.value = false;
  }
}

async function confirmAddToLibrary() { if (!recipeForConfirmation.value) return; try { const recipeToAdd = recipeForConfirmation.value; recipeForConfirmation.value = null; const { error: insertError } = await supabase.from('gerechten').insert(recipeToAdd); if (insertError) throw insertError; notificationMessage.value = `Recept "${recipeToAdd.naam}" is toegevoegd!`; setTimeout(() => { notificationMessage.value = '' }, 3000); await fetchAllRecipes(); } catch (error) { errorMessage.value = `Fout bij opslaan van recept: ${error.message}` } }
function cancelAddToLibrary() { recipeForConfirmation.value = null }

onMounted(() => {
  fetchAllRecipes()
  recipeChannel = supabase.channel('public:gerechten').on('postgres_changes', { event: '*', schema: 'public', table: 'gerechten' }, fetchAllRecipes).subscribe()
})
onUnmounted(() => { if (recipeChannel) supabase.removeChannel(recipeChannel) })
</script>

<template>
  <div class="library-view">
    <div v-if="notificationMessage" class="notification">{{ notificationMessage }}</div>
    <div class="header">
      <h1>Mijn Bibliotheek</h1>
      <p class="library-count">
        <strong>{{ libraryBreakdown.totaal }}</strong> Recepten
        (<strong>{{ libraryBreakdown.ontbijt }}</strong> Ontbijt, 
        <strong>{{ libraryBreakdown.lunch }}</strong> Lunch, 
        <strong>{{ libraryBreakdown.avondmaal }}</strong> Avondmaal)
      </p>
      <div class="button-group">
        <button @click="findNewRecipe('ontbijt')" :disabled="isFindingNewRecipes || isImporting">Voeg Ontbijt Toe</button>
        <button @click="findNewRecipe('lunch')" :disabled="isFindingNewRecipes || isImporting">Voeg Lunch Toe</button>
        <button @click="findNewRecipe('avondmaal')" :disabled="isFindingNewRecipes || isImporting">Voeg Avondmaal Toe</button>
      </div>
    </div>
    
    <div class="import-section">
      <h3>Recept Importeren via URL</h3>
      <div class="import-form">
        <input v-model="urlToImport" type="url" placeholder="https://www.njam.tv/recepten/...">
        <button @click="importFromUrl" :disabled="isImporting || isFindingNewRecipes">
          {{ isImporting ? 'Importeren...' : 'Importeer' }}
        </button>
      </div>
    </div>

    <div v-if="isFindingNewRecipes || isImporting" class="status-box">De AI-chef is aan het werk...</div>
    <div v-if="loading">Bibliotheek aan het laden...</div>
    <div v-else-if="errorMessage" class="error-box">{{ errorMessage }}</div>
    
    <div v-else class="library-board">
      <div v-for="(recipeList, category) in groupedAndSortedRecipes" :key="category" class="category-column">
        <h2 class="category-title">{{ category.charAt(0).toUpperCase() + category.slice(1) }} ({{ recipeList.length }})</h2>
        <div class="recipe-list">
          <router-link v-for="recipe in recipeList" :key="recipe.id" :to="'/gerecht/' + recipe.id" class="recipe-card">
            <img v-if="recipe.foto_url" :src="recipe.foto_url" :alt="recipe.naam">
            <div class="card-content">
              <div class="recipe-name">{{ recipe.naam }}</div>
              <div class="star-rating">
                <span v-for="i in 5" :key="i" class="star" :class="{ 'filled': i <= Math.round(recipe.avgRating) }">★</span>
                <span v-if="recipe.avgRating > 0" class="rating-number">({{ recipe.avgRating.toFixed(1) }})</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <div v-if="recipeForConfirmation" class="modal-overlay">
      <div class="modal-content">
        <h2>Nieuw Voorstel</h2>
        <img :src="recipeForConfirmation.foto_url" :alt="recipeForConfirmation.naam" class="modal-photo">
        <h3>{{ recipeForConfirmation.naam }}</h3>
        <div class="modal-info-bar">
          <span v-if="recipeForConfirmation.bereidingstijd">
            <strong>Tijd:</strong> {{ recipeForConfirmation.bereidingstijd }}
          </span>
        </div>
        <p v-if="recipeForConfirmation.omschrijving" class="modal-description">
          {{ recipeForConfirmation.omschrijving }}
        </p>
        <div class="modal-details">
          <h4>Ingrediënten</h4>
          <ul class="ingredients-list">
            <li v-for="(item, index) in recipeForConfirmation.ingredienten" :key="index">
              <span>{{ item.naam }}</span>
              <span>{{ item.hoeveelheid }}</span>
            </li>
          </ul>
          <h4>Instructies</h4>
          <p class="instructions" v-html="formattedInstructions"></p>
        </div>
        <div class="modal-actions">
          <button @click="cancelAddToLibrary" class="btn-secondary">Voeg niet toe</button>
          <button @click="confirmAddToLibrary" class="btn-primary">Voeg toe aan bibliotheek</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-view { padding: 20px; }
.header { display: flex; flex-direction: column; gap: 5px; align-items: center; margin-bottom: 20px; }
.library-count { font-size: 0.9rem; color: #666; margin: 0 0 15px 0; }
.button-group { display: flex; gap: 10px; }
.header button { background-color: #2c3e50; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; }
.header button:disabled { background-color: #ccc; cursor: not-allowed; }
.import-section { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center; }
.import-form { display: flex; gap: 10px; max-width: 600px; margin: 15px auto 0; }
.import-form input { flex-grow: 1; padding: 10px; font-size: 1rem; border: 1px solid #ccc; border-radius: 8px; }
.import-form button { background-color: #42b983; }
.library-board { display: grid; grid-template-columns: 1fr; gap: 30px; }
@media (min-width: 992px) { .library-board { grid-template-columns: repeat(3, 1fr); } }
.category-column { background-color: #f8f9fa; border-radius: 8px; padding: 15px; }
.category-title { text-transform: capitalize; border-bottom: 2px solid #42b983; padding-bottom: 10px; margin-bottom: 20px; margin-top: 5px; }
.recipe-list { display: flex; flex-direction: column; gap: 15px; }
.recipe-card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; text-decoration: none; color: inherit; background-color: white; display: flex; flex-direction: column; }
.recipe-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.recipe-card img { width: 100%; height: 160px; object-fit: cover; background-color: #eee; }
.card-content { padding: 15px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
.recipe-name { font-weight: bold; margin-bottom: 10px; }
.star-rating { font-size: 1rem; }
.star { color: #ccc; }
.star.filled { color: #ffc107; }
.rating-number { font-size: 0.8rem; color: #666; margin-left: 5px; }
.error-box { border: 1px solid #ff4d4d; background-color: #ffe6e6; color: #b30000; padding: 20px; border-radius: 8px; text-align: center; }
.status-box { background-color: #eef7ff; border: 1px solid #b3d7ff; color: #004085; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
.notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #28a745; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1001; }
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background-color: white; padding: 30px; border-radius: 10px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
.modal-photo { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }
.modal-info-bar { display: flex; gap: 20px; background-color: #f8f9fa; padding: 10px 15px; border-radius: 8px; margin: -10px 0 15px 0; }
.modal-description { font-style: italic; color: #555; border-bottom: 1px solid #eee; padding-bottom: 20px; }
.modal-details h4 { border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 20px; }
.modal-details .instructions { white-space: pre-wrap; line-height: 1.6; }
.ingredients-list { list-style: none; padding: 0; }
.ingredients-list li { display: flex; justify-content: space-between; padding: 8px 0; }
.modal-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 30px; }
.modal-actions button { padding: 10px 20px; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; }
.btn-primary { background-color: #2c3e50; color: white; border: none; }
.btn-secondary { background-color: #f1f1f1; color: #333; border: 1px solid #ccc; }
</style>