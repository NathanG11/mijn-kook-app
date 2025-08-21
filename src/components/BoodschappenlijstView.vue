<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../supabaseClient.js'

const shoppingList = ref({})
const loading = ref(true)
const errorMessage = ref('')
const planDate = ref(null)

// DEZE FUNCTIE IS NU ROBUUSTER GEMAAKT
function aggregateIngredients(ingredients) {
  const map = new Map();
  ingredients.forEach(item => {
    // CONTROLE: Sla het item over als het geen geldige naam heeft
    if (!item || !item.naam) {
      return; 
    }

    const key = `${item.naam.trim().toLowerCase()}|${(item.winkel || 'Overige')}`;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.hoeveelheid += ` + ${item.hoeveelheid}`;
    } else {
      map.set(key, { ...item, checked: false });
    }
  });
  return Array.from(map.values());
}

async function fetchShoppingList() {
  try {
    loading.value = true;
    const { data: plan, error: planError } = await supabase
      .from('week_plannen')
      .select('menu_data, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !plan) {
      errorMessage.value = "Geen weekmenu opgeslagen. Sla eerst een menu op de 'Weekmenu' pagina.";
      return;
    }
    
    planDate.value = new Date(plan.created_at).toLocaleDateString('nl-BE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});

    const recipeIds = [];
    Object.values(plan.menu_data).forEach(day => {
      Object.values(day).forEach(meal => {
        if (meal && meal.id) recipeIds.push(meal.id);
      });
    });

    const { data: recipes, error: recipesError } = await supabase
      .from('gerechten')
      .select('ingredienten')
      .in('id', recipeIds);

    if (recipesError) throw recipesError;

    const allIngredients = recipes.flatMap(r => r.ingredienten || []);
    const uniqueIngredients = aggregateIngredients(allIngredients);

    const aggregatedList = {};
    uniqueIngredients.forEach(ingredient => {
      const store = ingredient.winkel || 'Overige';
      if (!aggregatedList[store]) {
        aggregatedList[store] = [];
      }
      aggregatedList[store].push(ingredient);
    });
    shoppingList.value = aggregatedList;

  } catch (error) {
    errorMessage.value = `Fout bij ophalen boodschappenlijst: ${error.message}`;
  } finally {
    loading.value = false;
  }
}

function toggleChecked(item) {
  item.checked = !item.checked;
}

onMounted(() => {
  fetchShoppingList();
});
</script>

<template>
  <div class="shopping-list-view">
    <h1>Boodschappenlijst</h1>
    <p v-if="planDate" class="plan-date">Gebaseerd op het menu opgeslagen op {{ planDate }}</p>
    
    <div v-if="loading">Lijst wordt samengesteld...</div>
    <div v-else-if="errorMessage" class="error-box">{{ errorMessage }}</div>
    <div v-else>
      <div v-for="(items, store) in shoppingList" :key="store" class="store-section">
        <h2>{{ store }}</h2>
        <ul class="item-list">
          <li v-for="item in items.filter(i => !i.checked)" :key="item.naam" @click="toggleChecked(item)">
            <span class="checkbox"></span>
            <span class="item-details">
              <span class="item-name">{{ item.naam }}</span>
              <span class="item-quantity">{{ item.hoeveelheid }}</span>
            </span>
          </li>
          <li v-for="item in items.filter(i => i.checked)" :key="'checked-' + item.naam" class="checked" @click="toggleChecked(item)">
            <span class="checkbox">✓</span>
             <span class="item-details">
              <span class="item-name">{{ item.naam }}</span>
              <span class="item-quantity">{{ item.hoeveelheid }}</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shopping-list-view { padding: 20px; max-width: 800px; margin: auto; }
.plan-date { font-style: italic; color: #666; text-align: center; margin-top: -15px; margin-bottom: 30px; }
.store-section { margin-bottom: 30px; }
.store-section h2 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
.item-list { list-style: none; padding: 0; }
.item-list li { display: flex; align-items: center; padding: 15px 10px; border-bottom: 1px solid #f0f0f0; cursor: pointer; user-select: none; transition: all 0.2s ease; }
.item-list li:hover { background-color: #f9f9f9; }
.item-list li.checked { opacity: 0.5; text-decoration: line-through; background-color: #f1f1f1; }
.checkbox { display: flex; justify-content: center; align-items: center; width: 24px; height: 24px; border: 2px solid #ccc; border-radius: 4px; margin-right: 15px; font-weight: bold; color: #42b983; transition: all 0.2s ease; }
li.checked .checkbox { background-color: #42b983; border-color: #42b983; color: white; }
.item-details { display: flex; justify-content: space-between; flex-grow: 1; align-items: center; }
.item-name { font-weight: 500; }
.item-quantity { color: #666; font-size: 0.9em; }
.error-box { border: 1px solid #ff4d4d; background-color: #ffe6e6; color: #b30000; padding: 20px; border-radius: 8px; text-align: center; }
</style>