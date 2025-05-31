document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // --- Toolbar elements ---
  let allActivities = {};
  let currentCategory = "";
  let currentSearch = "";
  let currentSort = "name";

  // Create toolbar
  const activitiesContainer = document.getElementById("activities-container");
  const toolbar = document.createElement("div");
  toolbar.id = "activity-toolbar";
  toolbar.innerHTML = `
    <label for="category-filter">Category:</label>
    <select id="category-filter">
      <option value="">All</option>
    </select>
    <label for="activity-search">Search:</label>
    <input type="text" id="activity-search" placeholder="Search activities..." />
    <label for="activity-sort">Sort by:</label>
    <select id="activity-sort">
      <option value="name">Name</option>
      <option value="date">Date</option>
    </select>
  `;
  activitiesContainer.insertBefore(toolbar, activitiesList);

  const categoryFilter = document.getElementById("category-filter");
  const activitySearch = document.getElementById("activity-search");
  const activitySort = document.getElementById("activity-sort");

  // Function to get unique categories from activities
  function getCategories(activities) {
    const cats = new Set();
    Object.values(activities).forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats);
  }

  // Function to filter, search, and sort activities
  function filterActivities(activities) {
    let filtered = Object.entries(activities);
    if (currentCategory) {
      filtered = filtered.filter(([_, a]) => a.category === currentCategory);
    }
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(([name, a]) =>
        name.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q))
      );
    }
    if (currentSort === "name") {
      filtered.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (currentSort === "date") {
      filtered.sort((a, b) => {
        const d1 = a[1].date || "";
        const d2 = b[1].date || "";
        return d1.localeCompare(d2);
      });
    }
    return filtered;
  }

  // Function to render activities
  function renderActivities() {
    activitiesList.innerHTML = "";
    const filtered = filterActivities(allActivities);
    if (filtered.length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    filtered.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - details.participants.length;

      // Create participants HTML with delete icons instead of bullet points
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
            <h5>Participants:</h5>
            <ul class="participants-list">
              ${details.participants
                .map(
                  (email) =>
                    `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" aria-label="Remove participant">❌</button></li>`
                )
                .join("")}
            </ul>
          </div>`
          : `<p><em>No participants yet</em></p>`;

      const nameElement = document.createElement("h4");
      nameElement.textContent = name;

      const descriptionElement = document.createElement("p");
      descriptionElement.textContent = details.description;

      const scheduleElement = document.createElement("p");
      scheduleElement.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;

      const availabilityElement = document.createElement("p");
      availabilityElement.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

      const participantsContainer = document.createElement("div");
      participantsContainer.className = "participants-container";
      participantsContainer.innerHTML = participantsHTML;

      activityCard.appendChild(nameElement);
      activityCard.appendChild(descriptionElement);
      activityCard.appendChild(scheduleElement);
      activityCard.appendChild(availabilityElement);
      activityCard.appendChild(participantsContainer);

      activitiesList.appendChild(activityCard);
    });

    // Clear existing options in the select dropdown
    activitySelect.innerHTML = '';

    // Add options to select dropdown
    filtered.forEach(([name]) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      // Populate category filter
      const cats = getCategories(activities);
      categoryFilter.innerHTML = '<option value="">All</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join("");
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Toolbar event listeners
  categoryFilter.addEventListener("change", (e) => {
    currentCategory = e.target.value;
    renderActivities();
  });
  activitySearch.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderActivities();
  });
  activitySort.addEventListener("change", (e) => {
    currentSort = e.target.value;
    renderActivities();
  });

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
