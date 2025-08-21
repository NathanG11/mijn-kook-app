<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabaseClient.js'

const weekmenu = ref(null)
const loading = ref(true)
const errorMessage = ref('')
const alleGerechten = ref([])

const libraryBreakdown = computed(() => {
  const breakdown = {
    totaal: alleGerechten.value.length,
    ontbijt: alleGerechten.value.filter(g => g.maaltijd_type === 'ontbijt').length,
    lunch: alleGerechten.value.filter(g => g.maaltijd_type === 'lunch').length,
    avondmaal: alleGerechten.value.filter(g => g.maaltijd_type === 'avondmaal').length,
  }
  return breakdown
})

function getImageUrl(gerecht) {
  if (gerecht && gerecht.foto_url && gerecht.foto_url.startsWith('http')) {
    return gerecht.foto_url;
  }
  const naam = gerecht?.naam || 'Recept';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(naam)}&background=random&color=fff&size=256`;
}

async function generateMenuFromLibrary() {
  try {
    loading.value = true
    errorMessage.value = ''
    
    const { data, error } = await supabase
      .from('gerechten')
      .select('*')
      .neq('frequentie', 'Gearchiveerd')

    if (error) throw error
    
    alleGerechten.value = data || [];

    if (alleGerechten.value.length < 1) {
      errorMessage.value = "Je bibliotheek is leeg! Ga naar de Bibliotheek-pagina om meer recepten toe te voegen."
      return;
    }

    const createShuffledPool = (pool) => {
      const weightedPool = [];
      pool.forEach(gerecht => {
        if (gerecht.frequentie === 'Hoog') weightedPool.push(gerecht, gerecht, gerecht);
        else if (gerecht.frequentie === 'Normaal' || !gerecht.frequentie) weightedPool.push(gerecht, gerecht);
        else weightedPool.push(gerecht);
      });
      return weightedPool.sort(() => 0.5 - Math.random());
    };

    const ontbijtPool = alleGerechten.value.filter(g => g.maaltijd_type === 'ontbijt');
    const lunchPool = alleGerechten.value.filter(g => g.maaltijd_type === 'lunch');
    const avondmaalPool = alleGerechten.value.filter(g => g.maaltijd_type === 'avondmaal');

    let beschikbareOntbijten = createShuffledPool(ontbijtPool);
    let beschikbareLunches = createShuffledPool(lunchPool);
    let beschikbareAvondmalen = createShuffledPool(avondmaalPool);
    
    const dagen = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
    const nieuwMenu = {}
    const gebruikteIds = new Set();

    for (const dag of dagen) {
      nieuwMenu[dag] = {};
      const kiesGerecht = (pool, fallbackPool) => {
        if (pool.length > 0) {
          for (let i = 0; i < pool.length; i++) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            const gerecht = pool[randomIndex];
            if (!gebruikteIds.has(gerecht.id)) {
              gebruikteIds.add(gerecht.id);
              pool.splice(randomIndex, 1);
              return gerecht;
            }
          }
        }
        return fallbackPool.length > 0 ? fallbackPool[Math.floor(Math.random() * fallbackPool.length)] : null;
      };
      nieuwMenu[dag].Ontbijt = kiesGerecht(beschikbareOntbijten, ontbijtPool);
      nieuwMenu[dag].Lunch = kiesGerecht(beschikbareLunches, lunchPool);
      nieuwMenu[dag].Avondmaal = kiesGerecht(beschikbareAvondmalen, avondmaalPool);
    }
    weekmenu.value = nieuwMenu
  } catch (error) {
    errorMessage.value = `Oeps, er ging iets mis: ${error.message}`
  } finally {
    loading.value = false
  }
}

function replaceMeal(dag, maaltijd) {
  const huidigGerechtId = weekmenu.value[dag][maaltijd]?.id;
  let pool = [];
  if (maaltijd === 'Ontbijt') pool = alleGerechten.value.filter(g => g.maaltijd_type === 'ontbijt');
  if (maaltijd === 'Lunch') pool = alleGerechten.value.filter(g => g.maaltijd_type === 'lunch');
  if (maaltijd === 'Avondmaal') pool = alleGerechten.value.filter(g => g.maaltijd_type === 'avondmaal');
  if (pool.length <= 1) return;
  let alternatief = null;
  do {
    alternatief = pool[Math.floor(Math.random() * pool.length)];
  } while (alternatief.id === huidigGerechtId);
  weekmenu.value[dag][maaltijd] = alternatief;
}

// DEZE FUNCTIE IS NU TERUG
async function saveMenu() {
  if (!weekmenu.value) {
    alert('Genereer eerst een menu om op te slaan.');
    return;
  }
  try {
    const today = new Date();
    const start_datum = today.toISOString().split('T')[0];
    await supabase.from('week_plannen').delete().neq('id', -1);
    const { error } = await supabase.from('week_plannen').insert({
      start_datum: start_datum,
      menu_data: weekmenu.value
    });
    if (error) throw error;
    alert('Weekmenu succesvol opgeslagen! Je kunt het nu bekijken op de boodschappenpagina.');
  } catch (error) {
    alert(`Fout bij opslaan menu: ${error.message}`);
  }
}

onMounted(() => {
  generateMenuFromLibrary()
})
</script>

<template>
  <div class="week-view">
    <div class="header">
      <h1>Mijn Weekmenu</h1>
      <div class="button-group">
        <button @click="generateMenuFromLibrary" :disabled="loading || libraryBreakdown.totaal < 7">Hussel Menu</button>
        <button @click="saveMenu" :disabled="!weekmenu" class="primary-button">
          Sla op & Maak Boodschappenlijst
        </button>
      </div>
    </div>
    <p class="library-count">
      <strong>{{ libraryBreakdown.totaal }}</strong> Recepten in bibliotheek
      (<strong>{{ libraryBreakdown.ontbijt }}</strong> Ontbijt, 
      <strong>{{ libraryBreakdown.lunch }}</strong> Lunch, 
      <strong>{{ libraryBreakdown.avondmaal }}</strong> Avondmaal)
    </p>
    
    <div v-if="loading">Weekmenu wordt samengesteld...</div>
    <div v-else-if="errorMessage" class="error-box">{{ errorMessage }}</div>
    
    <div v-if="weekmenu" class="week-grid">
       <div v-for="(dag, dagNaam) in weekmenu" :key="dagNaam" class="day-card">
        <h2>{{ dagNaam }}</h2>
        <div class="meals-grid">
          <div class="meal-container">
            <router-link v-if="dag.Ontbijt" :to="'/gerecht/' + dag.Ontbijt.id" class="meal-item">
              <img :src="getImageUrl(dag.Ontbijt)" class="meal-photo" alt="Ontbijt">
              <span>{{ dag.Ontbijt.naam }}</span>
            </router-link>
            <span v-else>Vrij</span>
            <button v-if="dag.Ontbijt" @click="replaceMeal(dagNaam, 'Ontbijt')" class="replace-btn" title="Vervang dit gerecht">✕</button>
          </div>
           <div class="meal-container">
            <router-link v-if="dag.Lunch" :to="'/gerecht/' + dag.Lunch.id" class="meal-item">
              <img :src="getImageUrl(dag.Lunch)" class="meal-photo" alt="Lunch">
              <span>{{ dag.Lunch.naam }}</span>
            </router-link>
            <span v-else>Vrij</span>
            <button v-if="dag.Lunch" @click="replaceMeal(dagNaam, 'Lunch')" class="replace-btn" title="Vervang dit gerecht">✕</button>
          </div>
          <div class="meal-container">
            <router-link v-if="dag.Avondmaal" :to="'/gerecht/' + dag.Avondmaal.id" class="meal-item">
              <img :src="getImageUrl(dag.Avondmaal)" class="meal-photo" alt="Avondmaal">
              <span>{{ dag.Avondmaal.naam }}</span>
            </router-link>
            <span v-else>Vrij</span>
            <button v-if="dag.Avondmaal" @click="replaceMeal(dagNaam, 'Avondmaal')" class="replace-btn" title="Vervang dit gerecht">✕</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.button-group { display: flex; gap: 10px; }
.header button { border: 1px solid #ccc; background-color: #f4f4f4; color: #333; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; }
.header button.primary-button { background-color: #2c3e50; color: white; border: none; }
.header button:disabled { background-color: #ccc; cursor: not-allowed; }
.library-count { font-size: 0.9rem; color: #666; margin: 0 0 20px 0; text-align: right; }
.week-view { padding: 20px; font-family: sans-serif; }
.week-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.day-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background-color: #fafafa; }
.day-card h2 { margin-top: 0; color: #333; }
.meals-grid { display: flex; flex-direction: column; gap: 10px; }
.meal-container { display: flex; align-items: center; justify-content: space-between; }
.meal-item { flex-grow: 1; display: flex; align-items: center; gap: 10px; color: #2c3e50; text-decoration: none; font-weight: bold; }
.meal-item:hover { text-decoration: underline; }
.meal-photo { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; }
.error-box { border: 1px solid #ff4d4d; background-color: #ffe6e6; color: #b30000; padding: 20px; border-radius: 8px; text-align: center; }
.replace-btn { background: none; border: none; color: #aaa; font-size: 1.5rem; cursor: pointer; padding: 0 5px; line-height: 1; }
.replace-btn:hover { color: #e53e3e; }
</style>