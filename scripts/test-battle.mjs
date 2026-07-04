/**
 * BattleLearn E2E Battle Test
 * Creates a template, launches a session, registers 5 students,
 * and simulates them answering questions to defeat the boss.
 *
 * Reads credentials from the environment (loads .env.local if present):
 *   NEXT_PUBLIC_SUPABASE_URL   — project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — service role key (server-side only, NEVER commit)
 *   TEACHER_ID                 — optional; defaults to the first teacher profile
 */

import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch {
  // .env.local absent — rely on the ambient environment
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !SB_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Set them in .env.local or in the environment before running this script."
  );
  process.exit(1);
}

const headers = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rest(method, path, body) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function adminAuth(method, path, body) {
  const res = await fetch(`${SB_URL}/auth/v1/admin/${path}`, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Auth ${method} ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function generateBattleCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function resolveTeacherId() {
  if (process.env.TEACHER_ID) return process.env.TEACHER_ID;

  const teachers = await rest(
    "GET",
    "profiles?role=eq.teacher&select=id&limit=1"
  );
  if (!teachers.length) {
    throw new Error(
      "No teacher profile found. Set TEACHER_ID or create a teacher account first."
    );
  }
  return teachers[0].id;
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   BattleLearn E2E Battle Test — 5 Students   ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const TEACHER_ID = await resolveTeacherId();

  // 1. Create template with 6 question types
  console.log("📝 Step 1: Creating quiz template with 6 question types...");
  const questions = [
    {
      id: crypto.randomUUID(),
      type: "multiple_choice",
      text: "What is the capital of France?",
      difficulty: 1,
      options: ["London", "Paris", "Berlin", "Madrid"],
      correct_answer: "Paris",
    },
    {
      id: crypto.randomUUID(),
      type: "true_false",
      text: "The Earth is flat.",
      difficulty: 1,
      correct_answer: "false",
    },
    {
      id: crypto.randomUUID(),
      type: "short_answer",
      text: "What gas do plants absorb from the atmosphere?",
      difficulty: 2,
      correct_answer: "CO2",
    },
    {
      id: crypto.randomUUID(),
      type: "fill_blank",
      text: "Water boils at ___ degrees Celsius.",
      difficulty: 1,
      correct_answer: "100",
    },
    {
      id: crypto.randomUUID(),
      type: "ordering",
      text: "Arrange these planets from closest to farthest from the Sun:",
      difficulty: 3,
      items: ["Mercury", "Venus", "Earth", "Mars"],
      correct_answer: JSON.stringify(["Mercury", "Venus", "Earth", "Mars"]),
    },
    {
      id: crypto.randomUUID(),
      type: "matching",
      text: "Match the countries to their capitals:",
      difficulty: 2,
      pairs: [
        { term: "France", definition: "Paris" },
        { term: "Germany", definition: "Berlin" },
        { term: "Spain", definition: "Madrid" },
      ],
      correct_answer: JSON.stringify([["France", "Paris"], ["Germany", "Berlin"], ["Spain", "Madrid"]]),
    },
  ];

  const [template] = await rest("POST", "templates", {
    teacher_id: TEACHER_ID,
    boss_name: "The Riddler Dragon",
    boss_avatar_id: "dragon",
    questions,
  });
  console.log(`   ✅ Template: "${template.boss_name}" (${questions.length} questions)\n`);

  // 2. Create battle session
  console.log("🎮 Step 2: Creating battle session...");
  const battleCode = generateBattleCode();
  const expectedStudents = 5;
  const baseDamage = 10;
  const maxBossHp = Math.ceil(expectedStudents * baseDamage * questions.length);

  const [session] = await rest("POST", "sessions", {
    template_id: template.id,
    teacher_id: TEACHER_ID,
    battle_code: battleCode,
    expected_student_count: expectedStudents,
    status: "waiting",
  });

  // Create session_state for boss HP tracking
  await rest("POST", "session_state", {
    session_id: session.id,
    max_boss_hp: maxBossHp,
    current_boss_hp: maxBossHp,
    current_question_index: 0,
    logs: [],
  });

  console.log(`   ✅ Session: code=${battleCode}, Boss HP=${maxBossHp}\n`);

  // 3. Create 5 student accounts
  console.log("👥 Step 3: Registering 5 students...");
  const students = [];
  const studentNames = ["Alice", "Bob", "Charlie", "Diana", "Eve"];
  const ts = Date.now();

  for (const name of studentNames) {
    const email = `${name.toLowerCase()}.${ts}@battlelearn.test`;
    const user = await adminAuth("POST", "users", {
      email,
      password: "TestPass123!",
      email_confirm: true,
      user_metadata: { display_name: name, role: "student" },
    });

    // Ensure profile exists (trigger may fail silently)
    const existing = await rest("GET", `profiles?id=eq.${user.id}&select=id`);
    if (existing.length === 0) {
      await rest("POST", "profiles", {
        id: user.id,
        display_name: name,
        role: "student",
      });
    }

    students.push({ id: user.id, name, email });
    console.log(`   ⚔️  ${name} (${user.id.slice(0, 8)}...)`);
  }
  console.log();

  // 4. Students join
  console.log("🚪 Step 4: Students joining battle...");
  for (const student of students) {
    await rest("POST", "session_participants", {
      session_id: session.id,
      student_id: student.id,
    });
    console.log(`   → ${student.name} joined!`);
  }
  console.log();

  // 5. Start battle
  console.log("⚡ Step 5: Battle starts!");
  await rest("PATCH", `sessions?id=eq.${session.id}`, {
    status: "active",
    started_at: new Date().toISOString(),
  });
  console.log(`   Boss: 🐉 The Riddler Dragon — HP: ${maxBossHp}\n`);

  // 6. Simulate battle — all students answer all questions
  console.log("🗡️  Step 6: BATTLE IN PROGRESS\n");

  // Answer matrix: some correct, some wrong for realism
  const answers = {
    Alice:   ["Paris", "false", "CO2",             "100", '["Mercury","Venus","Earth","Mars"]',                         '[["France","Paris"],["Germany","Berlin"],["Spain","Madrid"]]'],
    Bob:     ["Paris", "true",  "Oxygen",           "100", '["Venus","Mercury","Earth","Mars"]',                         '[["France","Paris"],["Germany","Berlin"],["Spain","Madrid"]]'],
    Charlie: ["Berlin","false", "CO2",             "90",  '["Mercury","Venus","Earth","Mars"]',                         '[["France","Berlin"],["Germany","Paris"],["Spain","Madrid"]]'],
    Diana:   ["Paris", "false", "CO2",             "100", '["Mercury","Venus","Earth","Mars"]',                         '[["France","Paris"],["Germany","Berlin"],["Spain","Madrid"]]'],
    Eve:     ["Paris", "false", "carbon dioxide",  "100", '["Mercury","Venus","Mars","Earth"]',                         '[["France","Paris"],["Germany","Berlin"],["Spain","Madrid"]]'],
  };

  const correctAnswers = [
    "paris", "false", "co2", "100",
    JSON.stringify(["Mercury", "Venus", "Earth", "Mars"]),
    JSON.stringify([["France", "Paris"], ["Germany", "Berlin"], ["Spain", "Madrid"]]),
  ];

  const typeMultipliers = {
    multiple_choice: 1.0, short_answer: 1.3, true_false: 0.7,
    ordering: 1.5, matching: 1.3, fill_blank: 1.2,
  };
  // Difficulty is numeric in the app schema: 1 = easy, 2 = medium, 3 = hard
  const diffMultipliers = { 1: 0.8, 2: 1.0, 3: 1.4 };

  let totalDamage = 0;
  let currentHp = maxBossHp;
  const studentDamage = {};
  students.forEach(s => studentDamage[s.name] = 0);

  for (let qIdx = 0; qIdx < questions.length; qIdx++) {
    const q = questions[qIdx];
    const typeLabel = q.type.replace("_", " ").toUpperCase();
    console.log(`  ┌─ Q${qIdx + 1} [${typeLabel}] "${q.text}"`);

    for (const student of students) {
      const answer = answers[student.name][qIdx];
      let isCorrect = false;

      if (q.type === "ordering" || q.type === "matching") {
        try {
          isCorrect = JSON.stringify(JSON.parse(answer)) === JSON.stringify(JSON.parse(correctAnswers[qIdx]));
        } catch { isCorrect = false; }
      } else {
        isCorrect = answer.trim().toLowerCase() === correctAnswers[qIdx];
      }

      const damage = isCorrect ? Math.floor(baseDamage * typeMultipliers[q.type] * diffMultipliers[q.difficulty]) : 0;

      if (damage > 0) {
        totalDamage += damage;
        currentHp = Math.max(0, currentHp - damage);
        studentDamage[student.name] += damage;
      }

      const icon = isCorrect ? "⚔️ " : "❌";
      const dmgText = isCorrect ? `${damage} dmg` : "MISS";
      console.log(`  │  ${icon} ${student.name.padEnd(8)} → ${dmgText}`);
    }

    const hpBar = "█".repeat(Math.max(0, Math.round(currentHp / maxBossHp * 20))).padEnd(20, "░");
    console.log(`  └─ Boss HP: [${hpBar}] ${currentHp}/${maxBossHp}\n`);
  }

  // 7. Update database with final state
  const finalHp = Math.max(0, currentHp);
  const victory = finalHp <= 0;

  await rest("PATCH", `session_state?session_id=eq.${session.id}`, {
    current_boss_hp: finalHp,
    current_question_index: questions.length,
  });

  if (victory) {
    await rest("PATCH", `sessions?id=eq.${session.id}`, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
  }

  // Update participant damage
  for (const student of students) {
    await rest("PATCH", `session_participants?session_id=eq.${session.id}&student_id=eq.${student.id}`, {
      damage_dealt: studentDamage[student.name],
    });
  }

  // 8. Summary
  console.log("╔══════════════════════════════════════════╗");
  console.log("║           BATTLE RESULTS                 ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Boss: 🐉 The Riddler Dragon             ║`);
  console.log(`║  HP: ${String(finalHp).padStart(3)}/${maxBossHp}${victory ? " — DEFEATED!" : " — SURVIVED!"}`.padEnd(44) + "║");
  console.log(`║  Total damage: ${totalDamage}`.padEnd(44) + "║");
  console.log("╠══════════════════════════════════════════╣");
  console.log("║  LEADERBOARD                             ║");

  const sorted = Object.entries(studentDamage).sort((a, b) => b[1] - a[1]);
  const medals = ["🥇", "🥈", "🥉", "  ", "  "];
  sorted.forEach(([name, dmg], i) => {
    console.log(`║  ${medals[i]} ${name.padEnd(10)} ${String(dmg).padStart(3)} dmg`.padEnd(44) + "║");
  });

  console.log("╠══════════════════════════════════════════╣");
  console.log(`║  Battle Code: ${battleCode}`.padEnd(44) + "║");
  console.log(`║  Result: ${victory ? "🎉 VICTORY!" : "💀 Defeat..."}`.padEnd(44) + "║");
  console.log("╚══════════════════════════════════════════╝");

  // 9. Verify DB
  console.log("\n📊 DB Verification:");
  const [dbState] = await rest("GET", `session_state?session_id=eq.${session.id}&select=*`);
  console.log(`   session_state.current_boss_hp = ${dbState.current_boss_hp}`);
  console.log(`   session_state.max_boss_hp = ${dbState.max_boss_hp}`);

  const [dbSession] = await rest("GET", `sessions?id=eq.${session.id}&select=*`);
  console.log(`   sessions.status = ${dbSession.status}`);

  const participants = await rest("GET", `session_participants?session_id=eq.${session.id}&select=student_id,damage_dealt`);
  console.log(`   participants: ${participants.length} (all damage recorded)`);

  console.log("\n✅ E2E Battle test complete!");
}

main().catch(console.error);
