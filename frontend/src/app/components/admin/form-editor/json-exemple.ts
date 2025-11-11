export const json = {
  "title": "Formulaire de suggestion d'achat",
  "description": "Veuillez remplir ce formulaire pour suggérer l'achat d'un document",
  "logo": "https://suivi-papyrus.bib.umontreal.ca/assets/images/biblio-logo.png",
  "logoPosition": "left",
  "logoWidth": "250px",
  "logoHeight": "auto",
  "logoFit": "contain",
  "pages": [
    {
      "name": "identification",
      "title": "Identification",
      "elements": [
        {
          "type": "text",
          "name": "nom_diffuseur",
          "title": "Nom",
          "isRequired": false,
          "maxLength": 100
        },
        {
          "type": "text",
          "name": "categorie_usager",
          "title": "Catégorie d'usager",
          "isRequired": false,
          "maxLength": 100
        },
        {
          "type": "text",
          "name": "faculte_departement",
          "title": "Faculté/Département",
          "isRequired": false,
          "maxLength": 100
        },
        {
          "type": "text",
          "name": "identifiant",
          "title": "Identifiant",
          "visible": false,
          "defaultValue": "21225503758169"
        },
        {
          "type": "text",
          "name": "courriel_diffuseur",
          "title": "Courriel",
          "isRequired": false,
          "inputType": "email",
          "validators": [
            {
              "type": "email"
            }
          ]
        },
        {
          "type": "boolean",
          "name": "mailform_diffuseur_cc",
          "title": "M'envoyer une copie de la demande",
          "labelTrue": "Oui",
          "labelFalse": "Non",
          "defaultValue": true
        }
      ]
    },
    {
      "name": "description_suggestion",
      "title": "Description de la suggestion",
      "elements": [
        {
          "type": "dropdown",
          "name": "type_document",
          "title": "Type de document",
          "isRequired": true,
          "choices": [
            {
              "value": "",
              "text": "Faites un choix"
            },
            {
              "value": "livre",
              "text": "Livre"
            },
            {
              "value": "periodique",
              "text": "Périodique"
            },
            {
              "value": "audiovisuel",
              "text": "Document audiovisuel"
            },
            {
              "value": "base_donnees",
              "text": "Base de données"
            },
            {
              "value": "autre",
              "text": "Autre"
            }
          ]
        },
        {
          "type": "comment",
          "name": "titre",
          "title": "Titre",
          "isRequired": true,
          "rows": 2,
          "maxLength": 500
        },
        {
          "type": "text",
          "name": "auteur",
          "title": "Auteur ou autrice",
          "isRequired": true,
          "maxLength": 200
        },
        {
          "type": "text",
          "name": "annee_publication_url",
          "title": "Année de publication ou source internet (URL)",
          "isRequired": true,
          "maxLength": 100
        },
        {
          "type": "text",
          "name": "isbn_issn",
          "title": "ISBN/ISSN",
          "isRequired": false,
          "maxLength": 20
        },
        {
          "type": "text",
          "name": "edition",
          "title": "Édition",
          "isRequired": false,
          "maxLength": 100
        },
        {
          "type": "comment",
          "name": "notes_commentaires",
          "title": "Notes et commentaires",
          "isRequired": false,
          "rows": 5,
          "maxLength": 1000
        },
        {
          "type": "radiogroup",
          "name": "reserver_document",
          "title": "Voulez-vous réserver le document à son arrivée ?",
          "isRequired": false,
          "choices": [
            {
              "value": "oui",
              "text": "Oui"
            },
            {
              "value": "non",
              "text": "Non"
            }
          ],
          "defaultValue": "non"
        }
      ]
    },
    {
      "name": "corps_enseignant",
      "title": "Section réservée au corps enseignant",
      "elements": [
        {
          "type": "text",
          "name": "date_requis",
          "title": "Document requis pour un cours en date du ...",
          "isRequired": false,
          "inputType": "date"
        },
        {
          "type": "boolean",
          "name": "deposer_reserve_cours",
          "title": "Mettre le document à la réserve de cours?",
          "labelTrue": "Oui",
          "labelFalse": "Non",
          "defaultValue": false
        },
        {
          "type": "text",
          "name": "sigle_nom_cours",
          "title": "Sigle et nom du cours",
          "isRequired": false,
          "maxLength": 100,
          "visibleIf": "{deposer_reserve_cours} = true"
        }
      ]
    },
    {
      "name": "confirmation",
      "title": "Confirmation et envoi",
      "elements": [
        {
          "type": "html",
          "name": "info_important",
          "html": "<div style='background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #0057ac;'><h4 style='margin-top: 0; color: #0057ac;'>Informations importantes</h4><p>En cliquant sur \"Envoyer\", votre suggestion sera transmise à la Direction des bibliothèques.</p><p><strong>Destinataire :</strong> acq-suggestions@bib.umontreal.ca</p></div>"
        },
        {
          "type": "checkbox",
          "name": "confirmation",
          "title": "Je confirme que les informations fournies sont exactes",
          "isRequired": true,
          "choices": [
            {
              "value": "confirme",
              "text": "Je confirme l'exactitude des informations"
            }
          ],
          "validators": [
            {
              "type": "expression",
              "text": "Veuillez confirmer l'exactitude des informations",
              "expression": "{confirmation.length} > 0"
            }
          ]
        }
      ]
    }
  ],
  "showQuestionNumbers": "onPage",
  "questionDescriptionLocation": "underInput",
  "completeText": "Envoyer la suggestion",
  "completedHtml": "<div style='text-align: center; padding: 40px;'><h3 style='color: #0057ac;'>Merci pour votre suggestion !</h3><p>Votre formulaire de suggestion d'achat a été envoyé avec succès.</p><p>Vous devriez recevoir une copie de votre demande par courriel sous peu.</p><div style='margin-top: 30px;'><button onclick='window.location.reload()' style='background-color: #0057ac; color: white; border: none; padding: 10px 20px; border-radius: 30px; cursor: pointer;'>Faire une nouvelle suggestion</button></div></div>",
  "triggers": [
    {
      "type": "complete",
      "expression": "{confirmation.length} > 0",
      "actions": [
        {
          "type": "custom",
          "name": "submitForm"
        }
      ]
    }
  ]
}