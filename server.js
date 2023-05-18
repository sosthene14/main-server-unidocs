require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
app.use(express.json());
const cors = require("cors");
app.use(cors());
const port = 5005 || 3000;
const mongoUrl = process.env.MONGO_URL;
const bodyParser = require("body-parser");
app.use(bodyParser.json());
const bcrypt = require("bcryptjs");

function connectToDatabase() {
  mongoose
    .connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {})
    .catch((error) => {});
}

const User = require("./schema_mongo");

async function checkEmailExists(email) {
  const existingUser = await User.findOne({ email });
  return !!existingUser;
}
app.post("/addData", async (req, res) => {
  try {
    var salt = bcrypt.genSaltSync(10);
    const UserModel = new User({
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email,
      motDePasse: bcrypt.hashSync(req.body.motDePasse, salt),
      likes: {},
      hasVerified: false,
    });

    const emailExists = await checkEmailExists(req.body.email);

    if (emailExists) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    } else {
      const result = await UserModel.save();
      res.status(200).send({ message: "Data added successfully" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error adding data" });
  }
});

app.post("/signWGoogle", async (req, res) => {
  try {
    const UserModel = new User({
      nom: req.body.familyName,
      prenom: req.body.givenName,
      email: req.body.email,
      likes: {},
      hasVerified: true,
    });
    const emailExists = await checkEmailExists(req.body.email);

    if (emailExists) {
      return res.status(200).json({ message: "Data added successfully" });
    } else {
      const result = await UserModel.save();
      res.status(200).send({ message: "Data added successfully" });
    }
  } catch (error) {
    res.status(500).send({ message: "Error adding data" });
  }
});

app.post("/userExist", async (req, res) => {
  const email = req.body.email;
  const motDePasse = req.body.motDePasse;

  if (!email || !motDePasse) {
    res.status(201).send({ message: "Email et/ou mot de passe manquant(s)" });
  } else {
    const user = await User.findOne({ email: email });
    if (user && bcrypt.compareSync(motDePasse, user.motDePasse)) {
      if (!user.hasVerified) {
        res.status(401).send({ message: "Veuillez vérifier votre compte" });
      } else {
        res.status(200).send(user);
      }
    } else {
      res
        .status(400)
        .send({ message: "Email et/ou mot de passe incorrect(s)" });
    }
  }
});

app.get("/hasVerified/:email", async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email: email });
  if (user && user.hasVerified === false) {
    res.status(401).send();
  } else {
    res.status(200).send();
  }
});

app.post("/updatePassword", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    res.status(400).send({ message: "Email et/ou mot de passe manquant(s)" });
  } else {
    const user = await User.findOne({ email: email });
    if (user && bcrypt.compareSync(password, user.motDePasse)) {
      res.status(401).send();
    } else {
      User.findOneAndUpdate(
        { email: email },
        {
          motDePasse: bcrypt.hashSync(password, 10),
          hasVerified: true,
        },
        { new: true }
      )
        .then((updatedUser) => {
          if (updatedUser) {
            res
              .status(201)
              .send({ message: "Mot de passe mis à jour avec succès" });
          } else {
            res.status(404).send({ message: "Utilisateur non trouvé" });
          }
        })
        .catch((err) => {
          res.status(500).send({ message: "Erreur serveur" });
        });
    }
  }
});

app.get("/checkEmail/:email", async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email: email });
  if (user) {
    res.status(201).send();
  } else {
    res.status(501).send();
  }
});

app.get("/checkEmail_quiz/:email", async (req, res) => {
  const email = req.params.email;
  const user = await User.findOne({ email: email });
  if (user) {
    const nom = user.nom;
    const prenom = user.prenom;
    res.send({nom: nom, prenom : prenom})
  } else {
    res.status(501).send();
  }
});

async function addOrUpdatePreference(email, element, value) {
  const user = await User.findOneAndUpdate(
    { email: email },
    { $set: { likes: { [element]: value } } }
  );
  return user;
}

app.post("/updateUserPreference", async (req, res) => {
  const userData = await addOrUpdatePreference(
    req.body.email,
    req.body.id,
    req.body.value
  );
  if (userData) {
    if (userData) {
      res.status(200).send(userData);
    } else {
      res.status(400).send();
    }
  }
});

app.get("/getLikesHistory/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await User.findOne({ email: email });
    if (!user) {
      res.send({ status: "utilisateur introuvable" });
    } else {
      const likes = user.likes;
      const prenom = user.prenom;
      const nom = user.nom;
      const email = user.email;
      res.send({ likes: likes, prenom: prenom, nom: nom, email: email });
    }
  } catch (error) {
    res.send({ status: "erreur" });
  }
});

app.get("/setVerification/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await User.findOne({ email: email });

    if (!user) {
      res.send({ status: "utilisateur introuvable" });
    } else {
      user.hasVerified = true;
      await user.save();
      res.status(200).send("Vérifié");
    }
  } catch (error) {
    res.send({ status: "erreur" });
  }
});

app.post("/userConfirmPass", async (req, res) => {
  try {
    const email = req.body.email;
    const emailEncrypted = req.body.emailEncrypted;
    const user = await User.findOne({ email: email });
    if (!user) {
      res.status(400).send();
      console.log("erreur");
    } else {
      sendEmail(emailEncrypted, email).catch((err) => {
      });
      res.status(200).send(emailEncrypted);
    }
  } catch (error) {
    res.send({ status: "erreur" });
  }
});



function generateRandomCode(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
let randomCode;
// Démarrage de l'API!
async function startServer() {
  await connectToDatabase();
  app.listen(port, () => {
    console.log(port);
  });
}

startServer();
const nodemailer = require("nodemailer"); 
async function sendEmail(emailEncrypted, mailTo) {
  try {
    let transporter = nodemailer.createTransport({
      service: process.env.SERVICE,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });
    randomCode = generateRandomCode(6);
    const mailOptions = {
      from: "sosthenemounsambote14@gmail.com",
      to: mailTo,
      subject: "Confirmation mail",
      html: `<p>Veuillez confirmer votre adresse mail afin de vous connecter à votre compte code :<span style="color: black; font-weight:bold;">${randomCode}</span><br/>`,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
  
app.get("/getVerificationCode", async (req, res) => {
  try {
    res.send({ randomCode });
    
  } catch (error) {
    res.send({ status: "erreur" });
  }
});
