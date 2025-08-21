<script setup>
import { ref, onMounted } from 'vue';
import WelcomeModal from './components/WelcomeModal.vue';

const showWelcome = ref(false);

onMounted(() => {
  if (!localStorage.getItem('hasVisited')) {
    showWelcome.value = true;
  }
});

function closeWelcomeAndMarkVisited() {
  showWelcome.value = false;
  localStorage.setItem('hasVisited', 'true');
}

function openWelcome() {
  showWelcome.value = true;
}
</script>

<template>
  <WelcomeModal v-if="showWelcome" @close="closeWelcomeAndMarkVisited" />

  <div id="app-container">
    <header>
      <button @click="openWelcome" class="help-button" title="Toon instructies">?</button>
      
      <h1>Onze Kook App</h1>
      <nav>
        <router-link to="/profiel">Mijn Profiel</router-link>
        <router-link to="/bibliotheek">Bibliotheek</router-link>
        <router-link to="/">Weekmenu</router-link>
        <router-link to="/boodschappen">Boodschappen</router-link>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
#app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
header {
  position: relative; /* Nodig om de help-knop te positioneren */
  background-color: #f8f9fa;
  padding: 15px 30px;
  text-align: center;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 2rem;
}

/* NIEUWE STIJL VOOR DE HELP-KNOP */
.help-button {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #e0e0e0;
  color: #333;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}
.help-button:hover {
  background-color: #ccc;
}

nav {
  margin-top: 10px;
  display: flex;
  gap: 30px;
  justify-content: center;
  flex-wrap: wrap;
}
nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  font-size: 1.1rem;
  padding: 5px 0;
}
nav a.router-link-exact-active {
  color: #42b983;
  border-bottom: 2px solid #42b983;
}
main {
  padding-bottom: 50px;
}
</style>