/**
 * Main JavaScript file for Aquire Bot Dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Bootstrap tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function(tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Initialize Bootstrap popovers
  const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
  popoverTriggerList.map(function(popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl);
  });

  // Fetch and populate Discord channels for server settings
  const guildId = document.querySelector('form[data-guild-id]')?.dataset?.guildId;
  if (guildId) {
    // For welcome channel selector
    const welcomeChannelSelect = document.getElementById('welcome-channel');
    if (welcomeChannelSelect) {
      fetchGuildChannels(guildId, 'text').then(channels => {
        populateChannelSelect(welcomeChannelSelect, channels);
      });
    }

    // For temp VC channel selector
    const tempVcChannelSelect = document.getElementById('temp-vc-channel');
    if (tempVcChannelSelect) {
      fetchGuildChannels(guildId, 'voice').then(channels => {
        populateChannelSelect(tempVcChannelSelect, channels);
      });
    }

    // For temp VC category selector
    const tempVcCategorySelect = document.getElementById('temp-vc-category');
    if (tempVcCategorySelect) {
      fetchGuildChannels(guildId, 'category').then(categories => {
        populateChannelSelect(tempVcCategorySelect, categories);
      });
    }

    // For suggestion channel selector
    const suggestionChannelSelect = document.getElementById('suggestion-channel');
    if (suggestionChannelSelect) {
      fetchGuildChannels(guildId, 'text').then(channels => {
        populateChannelSelect(suggestionChannelSelect, channels);
      });
    }
  }

  // Form validation for settings
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
});

/**
 * Fetch guild channels from API
 * @param {string} guildId - The Discord guild ID
 * @param {string} type - The type of channel ('text', 'voice', 'category', or 'all')
 * @returns {Promise<Array>} - Array of channel objects
 */
async function fetchGuildChannels(guildId, type = 'all') {
  try {
    const response = await fetch(`/api/guilds/${guildId}/channels?type=${type}`);
    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }
    const data = await response.json();
    return data.channels || [];
  } catch (error) {
    console.error('Error fetching channels:', error);
    return [];
  }
}

/**
 * Populate a select element with channel options
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {Array} channels - Array of channel objects
 */
function populateChannelSelect(selectElement, channels) {
  if (!selectElement || !channels) return;
  
  // Get currently selected value to preserve it when repopulating
  const currentValue = selectElement.value;
  
  // Clear current options (keep the first one if it's a placeholder)
  const firstOption = selectElement.querySelector('option:first-child');
  selectElement.innerHTML = '';
  if (firstOption && !firstOption.value) {
    selectElement.appendChild(firstOption);
  }
  
  // Add channel options
  channels.forEach(channel => {
    const option = document.createElement('option');
    option.value = channel.id;
    option.textContent = channel.name;
    
    // If it's the previously selected value, mark it as selected
    if (channel.id === currentValue) {
      option.selected = true;
    }
    
    selectElement.appendChild(option);
  });
}

/**
 * Fetch guild roles from API
 * @param {string} guildId - The Discord guild ID
 * @returns {Promise<Array>} - Array of role objects
 */
async function fetchGuildRoles(guildId) {
  try {
    const response = await fetch(`/api/guilds/${guildId}/roles`);
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    const data = await response.json();
    return data.roles || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
}

/**
 * Populate a select element with role options
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {Array} roles - Array of role objects
 */
function populateRoleSelect(selectElement, roles) {
  if (!selectElement || !roles) return;
  
  // Get currently selected value to preserve it when repopulating
  const currentValue = selectElement.value;
  
  // Clear current options (keep the first one if it's a placeholder)
  const firstOption = selectElement.querySelector('option:first-child');
  selectElement.innerHTML = '';
  if (firstOption && !firstOption.value) {
    selectElement.appendChild(firstOption);
  }
  
  // Add role options
  roles.forEach(role => {
    // Skip @everyone role or any role you want to exclude
    if (role.name === '@everyone') return;
    
    const option = document.createElement('option');
    option.value = role.id;
    option.textContent = role.name;
    
    // If it's the previously selected value, mark it as selected
    if (role.id === currentValue) {
      option.selected = true;
    }
    
    selectElement.appendChild(option);
  });
}