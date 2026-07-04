# BattleLearn — Plan de continuation (audit du 4 juillet 2026)

Audit réalisé par 6 agents de lecture (moteur de combat, parcours prof, parcours élève, système RPG, base de données/sécurité, qualité/docs) + synthèse. Baseline au moment de l'audit : 43/43 tests unitaires verts, typecheck OK, build de production réparé (commit `21dc18a`).

## État global

Le MVP est visuellement et fonctionnellement avancé : 6 types de questions, scène isométrique animée, classes RPG avec vrais multiplicateurs, gestion de classes avec approbation, logique de combat pure bien testée. Mais le cycle de bout en bout est cassé en conditions réelles (realtime non publié → les élèves restent bloqués au lobby) et la sécurité n'est pas au niveau d'un test en classe (clé admin commitée, validation des réponses 100 % côté client, élévation de privilège élève→prof possible).

## Risques majeurs

| Sévérité | Risque |
|---|---|
| 🔴 Critique | Clé `service_role` commitée dans `scripts/test-battle.mjs` — **rotation à faire par toi dans le dashboard Supabase** |
| 🔴 Critique | RPC `deal_damage` sans validation serveur : triche (one-shot du boss, XP illimité) et usurpation d'identité triviales |
| 🔴 Critique | Un élève peut se promouvoir professeur (policy UPDATE de `profiles` + route `create-profile` non authentifiée) |
| 🔴 Critique | Realtime : seule `session_state` est publiée → lobby bloqué au « Start Battle », compteur prof figé |
| 🔴 Critique | Progression jamais persistée (RLS `USING(false)`) + `max_boss_hp` perdu au refresh → double comptage, barre HP 0/0 |
| 🔴 Critique | Deux migrations numérotées `00002` → déploiement neuf imprévisible |
| 🟠 Important | Énumération inter-classes : `invite_token` et `battle_code` lisibles par tous, auto-approbation possible |
| 🟠 Important | Équilibrage boss incohérent : imbattable si un absent, ou trop faible avec les bonus de classe non comptés |
| 🟠 Important | Templates ordering/matching insauvegardables ; `fill_blank` sans marqueur `___` gèle l'élève ; préférences accessibilité jamais persistées |

## Phases

### Phase 1 — Urgence sécurité
- [ ] **[TOI — IMMÉDIAT]** Rotater la clé `service_role` (dashboard Supabase → Settings → API → « Reset » sur service_role, puis mettre à jour `.env.local`). La branche `claude/jovial-dhawan` avec la clé dans son historique est **en ligne sur le repo PUBLIC j4yk21/facilitheque** — considérer la clé comme compromise publiquement. Supprimer aussi la branche distante (`git push origin --delete claude/jovial-dhawan`) et prévoir un repo BattleLearn dédié avec un historique propre (squash initial ou git-filter-repo).
- [ ] Sortir les secrets de `scripts/test-battle.mjs` vers `process.env` (+ fix difficulté `easy` → `1|2|3`)
- [ ] Authentifier la route `create-profile` (userId depuis la session, pas du body)
- [ ] Verrouiller l'UPDATE de `profiles` (role, total_xp, level non modifiables par l'utilisateur)
- [ ] Durcissement minimal de `deal_damage` (auth.uid(), participation vérifiée, plafonds, REVOKE PUBLIC)
- [ ] Anti-énumération : RPC de lookup par `invite_token` / `battle_code` exacts, `status='pending'` forcé à l'INSERT

### Phase 2 — Débloquer le cycle de jeu en classe
- [ ] Renuméroter `00002_classrooms_and_characters.sql` → `00004`
- [ ] Migration : `ALTER PUBLICATION supabase_realtime ADD TABLE sessions, session_participants` (le fix n°1 du projet)
- [ ] Fallback au lobby (vérif du status au mount + polling de secours) et victoire fiable (`setFinished` sur retour RPC)
- [ ] RLS `session_participants` : visibilité d'équipe + persistance de `current_question_index`
- [ ] Restaurer `max_boss_hp` et l'effectif attendu après refresh (store Zustand)
- [ ] Validation de templates par type (débloque ordering/matching, sécurise fill_blank)
- [ ] Fiabiliser le panneau prof (abonnement UPDATE sessions, erreurs de mutations remontées)

### Phase 3 — Validation serveur des réponses (anti-triche structurel)
- [ ] RPC `submit_answer` + table `session_answers` (validation SQL, dégâts/XP serveur, dédup par question)
- [ ] Ne plus envoyer les solutions au navigateur (projection du JSONB sans `correct_answer`)
- [ ] Level-up calculé côté serveur (formule `floor(total_xp/500)+1` extraite dans `src/lib/rpg`)
- [ ] Bonus d'équipe déterministes (refetch de la composition sur INSERT participant)
- [ ] Normalisation française des réponses texte (accents, `accepted_answers[]`, vrai/faux neutre)

### Phase 4 — Compléter les parcours prof et élève
- [ ] Écran de résultats de fin de session côté prof (la valeur pédagogique centrale — données déjà en base)
- [ ] Liste nominative des élèves connectés dans l'écran d'attente prof
- [ ] Suivi de progression individuelle en direct pendant le combat
- [ ] **[TOI]** Relier sessions ↔ classes/approbation (décision : garder un mode « code ouvert » sans classe ?)
- [ ] **[TOI]** Rééquilibrage du boss + fin sans victoire (décision : seuil de victoire ? défaite explicite ?)
- [ ] **[TOI]** Timer de question (décision : pénalité, auto-passage ou simple affichage ?)
- [ ] Retardataires et statut `paused` gérés côté élève

### Phase 5 — Qualité, accessibilité, langue, polish RPG
- [ ] Persistance réelle des préférences d'accessibilité (hook existant, actuellement code mort)
- [ ] `prefers-reduced-motion` respecté + mode contraste réellement effectif
- [ ] **[TOI]** Unifier la langue en français (décision : tutoiement ? bilingue à terme ?)
- [ ] README réel + `.env.example` complet
- [ ] Tests composants (jsdom + Testing Library) + CI GitHub Actions
- [ ] Combat visiblement coopératif (animer les coups des coéquipiers depuis les logs realtime)
- [ ] Scène isométrique > 5 élèves (grille dynamique)
- [ ] Correctifs techniques divers (router.push en plein rendu, Math.random en rendu, setTimeout non nettoyés…)
- [ ] **[TOI]** Donner un vrai rôle au soigneur (décision de game design majeure)

## Décisions qui t'attendent (aucun code ne les préjuge)

1. **Rotation de la clé Supabase** — à faire en premier, 2 minutes dans le dashboard.
2. Sessions liées aux classes ou mode « code ouvert » conservé ?
3. Seuil de victoire du boss (100 % de bonnes réponses est mathématiquement intenable) et existence d'une défaite.
4. Mécanique du timer de question.
5. Langue : tout français ? tutoiement ?
6. Rôle du soigneur (impacte schéma + gameplay).
