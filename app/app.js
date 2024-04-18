//Import the necessary modules:
import {
  FilesetResolver,
  FaceDetector,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";
//Define the constants and variables:
// Define the API key, base URL, cache key, and URL state enum.
const APIKEY = `43106191-5b69004c88157b6420397b410`;
const BASEURL = `https://pixabay.com/api/`;
const MYCACHEKEY = "brodie-cache";
const urlStateEnum = {
  saved: "saved",
  search: "search",
};
//Define the necessary variables:
let resultSearchContainer = null;
let keywordLabel = null;
let cacheRef = null;

//Define the necessary functions:
function init() {
  resultSearchContainer = document.getElementById("results");
  keywordLabel = document.getElementById("keyword");
  getEvListeners();
  openCache();
}
//This function opens the cache:
async function openCache() {
  cacheRef = await caches.open(MYCACHEKEY);
}
//This function retrieves the event listeners:
function getEvListeners() {
  window.addEventListener("popstate", popState);
  document.getElementById("btnRunSearch").addEventListener("click", runSearch);
  document
    .getElementById("savedPage")
    .addEventListener("click", showSavedImages);
  document.getElementById("searchPage").addEventListener("click", (e) => {
    e.target.classList.add("active");
    document.getElementById("savedPage").classList.remove("active");
    let newHash = `/`;
    history.pushState({}, "", newHash);
    resultSearchContainer.innerHTML = ``;
    document.querySelector(".searchForm").style.display = "block";
  });

  resultSearchContainer.addEventListener("click", handleImageClick);
  document.getElementById("saveImage").addEventListener("click", saveImage);
  document.getElementById("removeImage").addEventListener("click", removeImage);
  const dialog = document.getElementById("imageDialog");
  document
    .getElementById("cancelImage")
    .addEventListener("click", () => dialog.close());
}
//This function handles the popstate event:
// Check the URL hash to determine the current state.
function popState() {
  if (location.hash.includes("#search/")) {
    keywordLabel.value = location.hash.split("#search/")[1];
    document.querySelector(".searchForm").style.display = "block";
    runSearch();
  } else if (location.hash === "#saved") {
    document.querySelector(".searchForm").style.display = "none";
    showSavedImages();
  } else {
    cleanSearchResult();
  }
}
//This function updates the history:
// Update the URL hash with the new state.
function updateHistory(urlState, keyValue = "") {
  let newHash = `#${urlState}${keyValue ? `/${keyValue}` : ""}`;
  if (window.location.hash !== newHash) {
    history.pushState({}, "", newHash);
  }
}
// This function conducts a search using the Pixabay API by constructing a URL with search parameters based on the user's input keyword. It fetches and displays the search results.
// Construct the URL with necessary search parameters.
// Fetch the data from the Pixabay API.
function runSearch() {
  let keyword = keywordLabel.value;
  if (!keyword) return;
  let url = new URL(BASEURL);
  url.searchParams.append("key", APIKEY);
  url.searchParams.append("image_type", "photo");
  url.searchParams.append("orientation", "horizontal");
  url.searchParams.append("category", "people");
  url.searchParams.append("per_page", "30");
  url.searchParams.append("q", keyword);
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      displaySearchResults(data);
      updateHistory(urlStateEnum.search, keyword);
    })
    .catch((err) => console.error("Error fetching data:", err.message));
}
//This function clears the search results:
function cleanSearchResult() {
  keywordLabel.value = "";
  resultSearchContainer.innerHTML = "";
}
//This function displays the search results:
function displaySearchResults(data) {
  if (data.hits.length === 0) {
    resultSearchContainer.innerHTML = "<h2>No Search Results.</h2>";
    return;
  }
  let fragment = document.createDocumentFragment();
  data.hits.forEach((hit) => {
    let div = document.createElement("div");
    div.className = "card";
    div.setAttribute("data-full", hit.largeImageURL);
    let img = document.createElement("img");
    img.src = hit.previewURL;
    img.alt = `${hit.tags} photo`;
    div.appendChild(img);
    fragment.appendChild(div);
  });
  resultSearchContainer.innerHTML = "";
  resultSearchContainer.appendChild(fragment);
}
//This function handles the image click event:
function handleImageClick(ev) {
  let clickedDiv = ev.target.closest(".card");
  if (!clickedDiv) return;

  let fullImageURL = clickedDiv.getAttribute("data-full");
  document.getElementById("saveImage").style.display = "inline-block";
  document.getElementById("removeImage").style.display = "none";

  if (location.hash.includes("#saved")) {
    const tmp = ev.target.closest(".card").querySelector("img");
    if (tmp) {
      fullImageURL = tmp.src;
    }
  }

  const dialog = document.getElementById("imageDialog");
  const imgElement = document.getElementById("dialogImage");

  dialog.setAttribute("data-url", fullImageURL);
  document.querySelectorAll(".border").forEach((item) => item.remove());

  if (location.hash.includes("#saved")) {
    document.getElementById("removeImage").style.display = "inline-block";
    document.getElementById("saveImage").style.display = "none";

    detectPeople();
  }

  imgElement.src = fullImageURL;
  dialog.showModal();
}
//This function detects people in the image:
async function detectPeople() {
  const url = document.getElementById("imageDialog").getAttribute("data-url");
  if (!url) return;

  const blob = await getBlob(url);
  if (!blob) return;

  const img = new Image();
  img.src = URL.createObjectURL(blob);

  img.onload = async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const facedetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      },
    });
    const faces = await facedetector.detect(img);
    //If no people are detected, display a message.
    if (faces.detections.length === 0) {
      const result = document.createElement("p");
      result.classList.add("image-wrapper__nothing", "border");
      result.innerText = `No people detected`;
      document.querySelector(".image-wrapper").append(result);
    } else {
      faces.detections.forEach((face) => {
        const overlay = document.createElement("div");
        overlay.classList.add("image-wrapper__person", "border");
        overlay.style.cssText = `width: ${face.boundingBox.width}px; height: ${face.boundingBox.height}px; left: ${face.boundingBox.originX}px; top: ${face.boundingBox.originY}px;`;
        overlay.innerHTML = `<span>Confidence: ${(
          face.categories[0].score * 100
        ).toFixed(2)}%</span>`;
        document.querySelector(".image-wrapper").append(overlay);
      });
    }
  };
}
// Fetches an image blob from a URL. Used in face detection to obtain image data.
async function getBlob(url) {
  const result = await fetch(url)
    .then((result) => {
      if (!result.ok) {
        return null;
      }

      return result.blob();
    })
    .then((blob) => blob)
    .catch((err) => null);

  return result;
}
//This function saves the image to the cache:
async function saveImage() {
  try {
    const url = document.getElementById("imageDialog").getAttribute("data-url");
    await cacheRef.add(url);
    document.getElementById("imageDialog").close();
  } catch (error) {
    console.error("Failed to save image to cache:", error);
  }
}
//This function removes the image from the cache:
async function removeImage() {
  try {
    const url = document.getElementById("imageDialog").getAttribute("data-url");
    await cacheRef.delete(url);
    document.getElementById("imageDialog").close();
    showSavedImages();
  } catch (error) {
    console.error("Failed to delete image to cache:", error);
  }
}
//This function shows the saved images
async function showSavedImages() {
  document.querySelector(".searchForm").style.display = "none";

  document.getElementById("searchPage").classList.remove("active");
  document.getElementById("savedPage").classList.add("active");

  updateHistory(urlStateEnum.saved);
  resultSearchContainer.innerHTML = "";
  try {
    const keys = await cacheRef.keys();
    let fragment = document.createDocumentFragment();
    keys.forEach((request) => {
      let div = document.createElement("div");
      div.className = "card";
      let img = document.createElement("img");
      img.src = request.url;
      img.alt = "Saved photo";
      div.appendChild(img);
      fragment.appendChild(div);
    });
    resultSearchContainer.appendChild(fragment);
  } catch (err) {
    console.error("Error retrieving cache keys:", err);
  }
}

window.addEventListener("DOMContentLoaded", init);
