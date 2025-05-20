const questionText = document.getElementById("questionText");
const pokemonImage = document.getElementById("pokemonImage");
const searchInput = document.getElementById("pokemonsearch");
const searchResults = document.getElementById("searchResults");

const questionsChoices = [
    "Who's that Pokémon?",
    "What is this Pokémon's typing?",
    "What is this Pokémon's pre-evolution?",
    "Who does this Pokémon evolve into?"
];

let currentPokemon = null;
let pokemonNameList = [];

// Fetch the Pokémon list from the API
async function fetchPokemonList() {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
    const data = await response.json();
    pokemonNameList = data.results.map(pokemon => pokemon.name);
}

let correctAnswer = null;

async function loadNewQuestion() {
    const maxId = 1000;
    const randomId = Math.floor(Math.random() * maxId) + 1;

    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
    const data = await response.json();

    currentPokemon = {
        name: data.name,
        id: data.id,
        image: data.sprites.other["official-artwork"].front_default,
        types: data.types.map(t => t.type.name)
    };

    // Get species and evolution chain
    const speciesRes = await fetch(data.species.url);
    const speciesData = await speciesRes.json();

    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    // Helper to get pre- and post-evolutions
    function findChainEvolution(chain, target, prev = null) {
        if (chain.species.name === target) {
        return {
            previous: prev?.species.name || null,
            next: chain.evolves_to.map(e => e.species.name)
        };
        }
        for (const evolution of chain.evolves_to) {
        const result = findChainEvolution(evolution, target, chain);
        if (result) return result;
        }
        return null;
    }

    const evoResult = findChainEvolution(evoData.chain, currentPokemon.name);

    // Filter question options based on evolutions
    const filteredQuestions = questionsChoices.filter(q => {
        if (q === "What is this Pokémon's pre-evolution?") {
        return evoResult?.previous !== null;
        } else if (q === "Who does this Pokémon evolve into?") {
        return evoResult?.next && evoResult.next.length > 0;
        }
        return true;
    });

    // If no valid questions remain (shouldn't happen, but safe fallback)
    if (filteredQuestions.length === 0) {
        return loadNewQuestion(); // try a new Pokémon
    }

    const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
    questionText.innerText = question;
    pokemonImage.src = currentPokemon.image;

  // Set correct answer
    if (question === "Who's that Pokémon?") {
        correctAnswer = currentPokemon.name;
    } else if (question === "What is this Pokémon's typing?") {
        correctAnswer = currentPokemon.types.join(", ");
    } else if (question === "What is this Pokémon's pre-evolution?") {
        correctAnswer = evoResult?.previous || "None";
    } else if (question === "Who does this Pokémon evolve into?") {
        correctAnswer = evoResult?.next?.join(", ") || "None";
    }

  console.log("Question:", question, "| Correct Answer:", correctAnswer); // Debugging
}



// Event listener for the search input
searchInput.addEventListener("input", async () => {
    const query = searchInput.value.toLowerCase();
    searchResults.innerHTML = "";

    if (!query) {
        searchResults.style.display = "none";
        return;
    }

    const matches = pokemonNameList.filter(name => name.includes(query)).slice(0, 10); // limit results

    for (const name of matches) {
        const div = document.createElement("div");
        div.className = "result-item";

        const spriteImg = document.createElement("img");

        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
            const pokeData = await res.json();
            spriteImg.src =
                pokeData.sprites.front_default ||
                pokeData.sprites.other["official-artwork"].front_default ||
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"; // final fallback

        } catch {
            spriteImg.src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
        }

        const textSpan = document.createElement("span");
        textSpan.textContent = name;

        div.appendChild(spriteImg);
        div.appendChild(textSpan);

        div.onclick = () => {
            const userAnswer = name.toLowerCase();
            const expected = correctAnswer.toLowerCase();

            const isCorrect = expected.includes(userAnswer) || userAnswer.includes(expected);

            alert(isCorrect
                ? `✅ Correct! The answer was: ${correctAnswer}`
                : `❌ Incorrect.\nYou chose: ${name}\nCorrect answer: ${correctAnswer}`);

            searchInput.value = "";
            searchResults.style.display = "none";
            loadNewQuestion();
        };

        searchResults.appendChild(div);
    }

    searchResults.style.display = matches.length ? "block" : "none";
});


// Hide search results when clicking outside
document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = "none";
    }
});



// Initialize the game
(async function initGame() {
    await fetchPokemonList();
    await loadNewQuestion();
})();
