// Le modèle création des données qu'on va envoyer à la route avec mongoose
const express = require("express");
const app = express();
const scrapeIt = require("scrape-it");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(bodyParser.json());

mongoose.connect("mongodb://localhost/festival", { useNewUrlParser: true });

const Event = mongoose.model("Event", {
  id: String,
  title: String,
  address: String
});

const scraping = callback => {
  scrapeIt(
    "https://salsa.faurax.fr/festival.php",
    {
      data: {
        listItem: ".festival",
        data: {
          id: {
            attr: "id"
          },
          title: { selector: "h2" },
          address: { selector: ":nth-child(2n)" }
        }
      }
    },
    (err, { data }) => {
      callback(data, err);
    }
  );
};

// rajoute un nouvel Event en fonction de id avec tout les elements puis sauvegardé dans newSubject . Si erreur alors alors on rappel la fonction.
app.get("/scrapingFestival", async (req, res) => {
  try {
    scraping((data, err) => {
      // appel de la fonction scraping afin de récupérer les données
      if (err) {
        res.status(400).json({ error: error.message });
      } else {
        data.data.forEach(async element => {
          // on boucle sur chaque élément du tableau data.data. On boucle dans data.data parce que "data" est objet, or on ne peut boucler que sur un tableau.
          const result = await Event.findOne({ id: element.id }); // on vérifie (pour chaque élément de la boucle) s'il est déjà présent dans la base de données
          if (!result) {
            // s'il n'est pas présent
            const newEvent = new Event({
              // on l'ajoute à notre base de données, conformément au Model "Event"
              id: element.id,
              title: element.title,
              address: element.address
            });
            await newEvent.save(); // on sauvegrade notre nouvel Subject
          }
        });
        res.status(200).json({ message: "Scraping done" }); // la réponse qu'enverra le serveur si tout se passe bien
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message }); // la réponse du serveur si quelque chose se passe mal
  }
});

/**Read */
app.get("/festival", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3002, () => {
  // Demarage server
  console.log("Server has started");
});
