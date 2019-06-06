//Creation du type de données avec mongoose
const express = require("express");
const app = express();
const scrapeIt = require("scrape-it");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");

//Création des SignIn et SignUp suivit de la procédure de React Cours 12
const uid2 = require("uid2");
const randomString = uid2(16);

const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

// const password = req.body.password;
// const token = uid2(16);
// const salt = uid2(16);
// const hash = SHA256(password + salt).toString(encBase64);

//Après l'installation du package crypto, j'ai mis la constante suivante faire référence à la doc :
var AES = require("crypto-js/aes");

// const dateFns = require("date-fns");

app.use(bodyParser.json());
// Mongoose librairie pour utiliser et se connecter a MongoDB
mongoose.connect("mongodb://localhost/danse", { useNewUrlParser: true });
const Event = mongoose.model("Event", {
  id: String,
  title: String,
  tags: Array,
  horaire: String,
  map: String,
  facebook: String,
  description: String,
  date: String,
  price: String,
  adresse: String,
  latitude: String,
  longitude: String,
  vote: { Type: Number, default: 0 }
}); //model structure demandé objet (clefs-valeurs)
// const Map = mongoose.model("Map", {
//   id: String,
//   latitude: String,
//   longitude: String,
//   author: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Event"
//   }
// });

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

const User = mongoose.model("User", {
  id: String,
  email: String,
  password: String,
  token: String, // Le token permettra d'authentifier l'utilisateur
  hash: String,
  salt: String,
  voted: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event"
    }
  ]
});

// const SignUp = mongoose.model("SignUp", {
//   id: String,
//   name: String,
//   email: String,
//   password: String
// });

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
          tags: {
            listItem: ".description > p:first-child > strong .label"
            // convert: str => {
            //   const tags = str.split(",")[0].split(" ")[0];
            //   return tags.split(" ").map(tag => tag);
          },

          horaire: {
            selector: ".soiree-info > .description > p:first-child > strong",
            convert: str => {
              let hour = str.split(",")[0].split("  ")[1];
              return hour;
            }
          },
          map: { selector: "a", attr: "href" },
          facebook: {
            selector: "a"
          },
          description: { selector: ".comm" },
          date: {
            selector: "abbr",
            attr: "title"
          },
          price: {
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
// rajoute un nouvel Event en fonction de id avec tous les elements puis sauvegarder dans newEvent . Si erreur alors on rappelle la fonction.
app.get("/scraping", async (req, res) => {
  try {
    scraping((data, err) => {
      // appel de la fonction scraping afin de récupérer les données
      if (err) {
        res.status(400).json({ error: error.message });
      } else {
        const extractAddress = str => {
          newStr = str.replace(/ /g, "+");
          streetAdressBeta = newStr.split("750")[0];
          firstArray = streetAdressBeta.split("");
          firstArray.pop();
          if (
            firstArray[firstArray.length - 1] === "," ||
            firstArray[firstArray.length - 1] === "."
          ) {
            firstArray.pop();
          }
          finalAdresse = firstArray.join("");
          return finalAdresse;
        };
        const extractZip = str => {
          newStr = str.replace(/ /g, "+");
          zipCode = newStr.split("750")[1];
          zipBeta = zipCode.split("+")[0].split("");
          zipBeta.unshift("750");
          finalZip = zipBeta.join("");
          return finalZip;
        };

        data.data.forEach(async element => {
          // replace(element.adresse);
          const response = await axios.get(
            `https://api-adresse.data.gouv.fr/search/?q=${extractAddress(
              element.adresse
            )}&postcode=${extractZip(element.adresse)} `
            // 36+boulevard+de+la+bastille"
          );
          // on boucle sur chaque élément du tableau data.data. On boucle dans data.data parce que "data" est objet, or on ne peut boucler que sur un tableau.
          const result = await Event.findOne({ id: element.id }); // on vérifie (pour chaque élément de a boucle) s'il est déjà présent dans la base de données
          // let d = new Date(element.date);
          // let sevenDaysPast = d.setDate(d.getDate() - 7);
          // console.log(sevenDaysPast);
          if (!result) {
            // s'il n'est pas présent
            const newEvent = new Event({
              //   // on l'ajoute à notre base de données, conformément au Model "Event"
              id: element.id,
              title: element.title,
              tags: element.tags,
              horaire: element.horaire,
              map: element.map,
              facebook: element.facebook,
              description: element.description,
              date: element.date,
              price: element.price,
              adresse: element.adresse,
              longitude: response.data.features[0].geometry.coordinates[0],
              latitude: response.data.features[0].geometry.coordinates[1]
              // latitude: element.latitude.replace(str)[0],
              // longitude: element.longitude.replace(str)[1]
            });

            await newEvent.save(); // on sauvegarde notre nouvel Event
          } else {
            let dateEvent = new Date(element.date);
            let dateNow = new Date();
            let diff = dateEvent - dateNow;
            // console.log(dateEvent);
            // console.log(typeof dateEvent);
            console.log(diff);
            if (diff < 0) {
              await result.remove();
            }

            // else {
            //   let diff = NaN;
            //   let dateEvent = new Date(element.date);
            //   console.log(dateEvent);
            // }

            // if (Event.date >= new Date()) {
            //   await Event.remove();
            // }
            // await Event.remove();
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

// // **Create**
// app.post("/create", async (req, res) => {
//   try {
//     const newEvent = new Event({
//       id: req.body.id,
//       title: req.body.title,
//       tags: req.body.tags,
//       horaire: req.body.horaire,
//       map: req.body.map,
//       facebook: req.body.facebook,
//       description: req.body.description,
//       date: req.body.date,
//       price: req.body.price,
//       adresse: req.body.adresse,
//       longitude: req.body.longitude,
//       latitude: req.body.longitude
//     });
//     await newEvent.save();
//     res.json({ message: "Created" });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

// // **Delete**
// app.post("/delete", async (req, res) => {
//   try {
//     if (element.id) {
//       const event = await Event.findOne({ id: element.id });
//       // Autre manière de trouver un document à partir d'un `id` :
//       // const student = await Student.findById(req.body.id);
//       await event.remove();
//       res.json({ message: "Removed" });
//     } else {
//       res.status(400).json({ message: "Missing id" });
//     }
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

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
          title: { selector: "h2" }
          // adresse: listItem.match(/Du(.*)à/)[1]
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

//__________________________________________________________________________________________________
// SignUp & SignIn

// **Create**

app.post("/signup", async (req, res) => {
  try {
    const token = uid2(16);
    const salt = uid2(16);
    const hash = SHA256(req.body.password + salt).toString(encBase64);

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      salt: salt,
      hash: hash,
      token: token
    });
    await user.save();
    res.json({ message: "Created" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// **Read**
app.post("/signin", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      let newHash = SHA256(req.body.password + user.salt).toString(encBase64);
      if (newHash === user.hash) {
        return res.status(200).json({ token: user.token });
      } else {
        return res.status(401).json({ message: "Password incorrect" });
      }
    } else {
      return res.status(401).json({ message: "email incorrect" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.post("/voted", async (req, res) => {
  try {
    const votedEvent = await Event.findOne({ id: req.body.eventId });
    const userVoter = await User.findOne({ token: req.body.token });
    votedEvent.vote = votedEvent.vote + 1;
    userVoter.voted.push(votedEvent._id);
    await votedEvent.save();
    await userVoter.save();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// **Delete**
// app.post("/deleteCustomers", async (req, res) => {
//   try {
//     if (req.body.id) {
//       const SignIn = await SignIn.findOne({ _id: req.body.id });
//       // Autre manière de trouver un document à partir d'un `id` :
//       // const student = await Student.findById(req.body.id);
//       await SignIn.remove();
//       res.json({ message: "Removed" });
//     } else {
//       res.status(400).json({ message: "Missing id" });
//     }
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

app.listen(3000, () => {
  // Demarage server
  console.log("Server has started");
});
