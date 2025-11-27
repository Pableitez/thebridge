const fs = require('fs-extra');
const path = require('path');

// Backend configuration
const config = {
  paths: {
    dataRoot: path.join(__dirname, 'backend', 'data')
  }
};

async function checkBackendUsers() {
  console.log('🔍 Checking backend users and teams...\n');
  
  try {
    // Check teams directory
    const teamsPath = path.join(config.paths.dataRoot, 'teams');
    console.log(`📁 Teams directory: ${teamsPath}`);
    
    if (await fs.pathExists(teamsPath)) {
      const teamFolders = await fs.readdir(teamsPath);
      console.log(`✅ Found ${teamFolders.length} team folders`);
      
      for (const folder of teamFolders) {
        const teamConfigPath = path.join(teamsPath, folder, 'team-config.json');
        if (await fs.pathExists(teamConfigPath)) {
          const teamConfig = await fs.readJson(teamConfigPath);
          console.log(`\n🏢 Team: ${teamConfig.name} (${teamConfig.code || 'No code'})`);
          console.log(`   ID: ${folder}`);
          console.log(`   Created: ${teamConfig.createdAt}`);
          console.log(`   Members: ${teamConfig.members ? teamConfig.members.length : 0}`);
          
          if (teamConfig.members && teamConfig.members.length > 0) {
            console.log('   Users:');
            teamConfig.members.forEach(member => {
              console.log(`     - ${member.name} (${member.email}) - ${member.role}`);
            });
          }
        }
      }
    } else {
      console.log('❌ Teams directory does not exist');
    }
    
    // Check users directory
    const usersPath = path.join(config.paths.dataRoot, 'users');
    console.log(`\n📁 Users directory: ${usersPath}`);
    
    if (await fs.pathExists(usersPath)) {
      const userFolders = await fs.readdir(usersPath);
      console.log(`✅ Found ${userFolders.length} user folders`);
      
      for (const folder of userFolders) {
        console.log(`\n👤 User folder: ${folder}`);
        
        // Check for user profiles
        const userProfilesPath = path.join(usersPath, folder);
        const userProfiles = await fs.readdir(userProfilesPath);
        
        for (const profileFile of userProfiles) {
          if (profileFile.endsWith('.json')) {
            const profilePath = path.join(userProfilesPath, profileFile);
            try {
              const profile = await fs.readJson(profilePath);
              console.log(`   📄 ${profileFile}: ${profile.name || 'Unknown'} (${profile.email || 'No email'})`);
            } catch (error) {
              console.log(`   📄 ${profileFile}: Error reading file`);
            }
          }
        }
      }
    } else {
      console.log('❌ Users directory does not exist');
    }
    
    // Check dashboard configurations
    const dashboardPath = path.join(config.paths.dataRoot, 'dashboard-configs');
    console.log(`\n📁 Dashboard configs directory: ${dashboardPath}`);
    
    if (await fs.pathExists(dashboardPath)) {
      const configFolders = await fs.readdir(dashboardPath);
      console.log(`✅ Found ${configFolders.length} dashboard config folders`);
      
      for (const folder of configFolders) {
        console.log(`\n⚙️  Config folder: ${folder}`);
        
        const configPath = path.join(dashboardPath, folder);
        const configFiles = await fs.readdir(configPath);
        
        for (const configFile of configFiles) {
          if (configFile.endsWith('.json')) {
            const filePath = path.join(configPath, configFile);
            try {
              const config = await fs.readJson(filePath);
              console.log(`   📄 ${configFile}: ${config.name || 'Unnamed config'} (${config.lastUpdated || 'No date'})`);
            } catch (error) {
              console.log(`   📄 ${configFile}: Error reading file`);
            }
          }
        }
      }
    } else {
      console.log('❌ Dashboard configs directory does not exist');
    }
    
  } catch (error) {
    console.error('❌ Error checking backend:', error);
  }
}

// Run the check
checkBackendUsers(); 