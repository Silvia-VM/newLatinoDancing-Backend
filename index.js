//Creation du type de données avec mongoose
const express = require("express");
const app = express();
const scrapeIt = require("scrape-it");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(bodyParser.json());
// Mongoose librairie pour utiliser et se connecter a MongoDB
mongoose.connect("mongodb://localhost/danse", { useNewUrlParser: true });
const Event = mongoose.model("Event", {
  id: String,
  title: String,
  description: String,
  date: String,
  price: String,
  adresse: String
}); //model structure demandé objet (clefs-valeurs)

const Festival = mongoose.model("Festival", {
  id: String,
  title: String,
  adresse: String
});

const Cours = mongoose.model("Cours", {
  id: String,
  title: String,
  telephone: String,
  ville: String,
  site: String
});

//scraping recherche de données.Creation d'une fonction que l'on rappel une deuxieme fois
let scraping = callback => {
  scrapeIt(
    "https://salsa.faurax.fr/index.php/Paris",
    {
      data: {
        listItem: ".vevent",
        data: {
          id: {
            attr: "id"
          },
          title: { selector: ".summary" },
          description: { selector: ".comm" },
          date: {
            selector: "abbr",
            attr: "title"
          },
          prix: {
            selector: "strong",
            convert: str => {
              let price = str.split(",")[1].split("€")[0]; // permet de dégager la valeur du prix en eliminant les horaires et le contenu des autres balises
              if (price == Number(price)) {
                // si la valeur récupérée est bien un nombre
                return price; // on retourne le prix
              } else {
                return "Gratuit"; // sinon on retourne "Gratuit"
              }
            }
          },
          // prix: { listItem: ".description > p:first-child" },
          adresse: { selector: ".lieu" }
        }
      }
    },
    (err, { data }) => {
      callback(data, err); //fonction rappelée avec la data obtenue, ou l'erreur le cas échéant
    }
  );
};
// rajoute un nouvel Event en fonction de id avec tout les elements pui sauvegardé dans newEvent . Si erreur alor alors on rappel la fonction.
app.get("/scraping", async (req, res) => {
  try {
    scraping((data, err) => {
      // appel de la fonction scraping afin de récupérer les données
      if (err) {
        res.status(400).json({ error: error.message });
      } else {
        data.data.forEach(async element => {
          // on boucle sur chaque élément du tableau data.data. On boucle dans data.data parce que "data" est objet, or on ne peut boucler que sur un tableau.
          const result = await Event.findOne({ id: element.id }); // on vérifie (pour chaque élément de a boucle) s'il est déjà présent dans la base de données
          if (!result) {
            // s'il n'est pas présent
            const newEvent = new Event({
              // on l'ajoute à notre base de données, conformément au Model "Event"
              id: element.id,
              title: element.title,
              description: element.description,
              date: element.date,
              price: element.price,
              adresse: element.adresse
            });
            await newEvent.save(); // on sauvegrade notre nouvel Event
          }
        });
        res.status(200).json({ message: "Scraping done" }); // la réponse qu'enverra le serveur si tout se passe bien
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message }); // la réponse du serveur si quelque chose se passe mal
  }
});

// **Read Events(soirées) scraping**
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//__________________________________________________________________________________________________
// Scraping festival
let scraping2 = callback => {
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
          adresse: { selector: "h2" } //.match(/Du(.*)à/)[1]
        }
      }
    },

    (err, { data }) => {
      callback(data, err);
    }
  );
};
app.get("/scraping2", async (req, res) => {
  try {
    scraping2((data, err) => {
      if (err) {
        res.status(400).json({ error: error.message });
      } else {
        data.data.forEach(async element => {
          const result = await Festival.findOne({ id: element.id });
          if (!result) {
            const newFestival = new Festival({
              id: element.id,
              title: element.title,
              adresse: element.adresse
            });
            await newFestival.save();
          }
        });
        res.status(200).json({ message: "Scraping done" });
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// **Read Festivals scraping**
app.get("/festivals", async (req, res) => {
  try {
    const festivals = await Festival.find();
    res.json(festivals);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
//__________________________________________________________________________________________________
// Scraping Cours
let scraping3 = callback => {
  scrapeIt(
    "https://salsa.faurax.fr/cours.php/dpt/75",
    {
      data: {
        listItem: ".conteneur12",
        data: {
          id: {
            attr: "id"
          },
          title: { selector: "h2" },
          telephone: { selector: ".tel" },
          ville: {
            selector: ".adr"
          },
          site: { selector: ".grid3" }
        }
      }
    },

    (err, { data }) => {
      callback(data, err);
    }
  );
};

app.get("/scraping3", async (req, res) => {
  try {
    scraping3((data, err) => {
      if (err) {
        res.status(400).json({ error: error.message });
      } else {
        data.data.forEach(async element => {
          const result = await Cours.findOne({ id: element.id });
          if (!result) {
            const newCours = new Cours({
              id: element.id,
              title: element.title,
              telephone: element.telephone,
              ville: element.ville,
              site: element.site
            });
            await newCours.save();
          }
        });
        res.status(200).json({ message: "Scraping done" });
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// **Read Cours scraping**
app.get("/cours", async (req, res) => {
  try {
    const cours = await Cours.find();
    res.json(cours);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => {
  // Demarage server
  console.log("Server has started");
});
