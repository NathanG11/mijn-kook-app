import { createRouter, createWebHistory } from 'vue-router'
import WeekView from '../components/WeekView.vue'
import LibraryView from '../components/LibraryView.vue'
import RecipeDetail from '../components/RecipeDetail.vue'
import BoodschappenlijstView from '../components/BoodschappenlijstView.vue'
import ProfileView from '../components/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: WeekView
    },
    {
      path: '/bibliotheek',
      name: 'library',
      component: LibraryView
    },
    {
      path: '/boodschappen',
      name: 'shopping-list',
      component: BoodschappenlijstView
    },
    {
      path: '/profiel',
      name: 'profile',
      component: ProfileView
    },
    {
      path: '/gerecht/:id',
      name: 'recipe-detail',
      component: RecipeDetail
    }
  ]
})

export default router