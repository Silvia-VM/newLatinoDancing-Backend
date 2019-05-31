//Creation du type de données avec mongoose
const express = require("express");
const app = express();
const scrapeIt = require("scrape-it");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(bodyParser.json());
// Mongoose librairie pour utiliser et se connecter a MongoDB
mongoose.connect("mongodb://localhost/soiree", { useNewUrlParser: true });
const Event = mongoose.model("Event", {
  id: String,
  title: String,
  description: String,
  date: String,
  price: String,
  adresse: String,
  coordinate: String
}); //model structure demandé objet (clefs-valeurs)

//scraping recherche de données.Creation d'une fonction que l'on rappel une deuxieme fois
const scraping = callback => {
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

//**Read */
app.get("/", async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => {
  // Demarage server
  console.log("Server has started");
});

// }).then(({ data, response }) => {
//   console.log(`Status Code: ${response.statusCode}`);
//   console.log(data);
// });

// scrapeIt("https://salsa.faurax.fr/festival.php", {
//   events: {
//     listItem: ".festival",
//     data: {
//       title: { selector: "h2" },
//       address: { selector: ":nth-child(2n)" }
//     }
//   }
// }).then(({ data, response }) => {
//   console.log(`Status Code: ${response.statusCode}`);
//   console.log(data);
// });
