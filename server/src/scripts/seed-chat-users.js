require("dotenv").config();

const { getSupabase } = require("../config/supabase");

const seedUsers = [
  {
    phone: "9825344428",
    name: "User 4428",
    about: "Available",
    is_online: false
  },
  {
    phone: "7990979942",
    name: "User 9942",
    about: "Available",
    is_online: false
  }
];

async function main() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("chat_users")
    .upsert(seedUsers, {
      onConflict: "phone"
    })
    .select("id, phone, name");

  if (error) {
    throw error;
  }

  console.log("Seeded chat users:");
  for (const user of data) {
    console.log(`- ${user.phone} (${user.name}) id=${user.id}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
