import React, { useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { AGENTS, ROLES, AGENT_IMAGES, AGENT_BANNERS, MAP_IMAGES, MAPS, RANK_THRESHOLDS } from '../constants';
import { getRankInfo, getLevelProgress } from '../services/gameService';
import Card from './ui/Card';
import Button from './ui/Button';
import { RankRequirementsModal } from './RankRequirementsModal';
import { Camera, Edit2, Save, X, User as UserIcon, Award, Flame, Star, Shield, Crown, ThumbsUp, TrendingUp, Map as MapIcon, Activity, Users, Link as LinkIcon, Loader2, CheckCircle, AlertTriangle, UserPlus, ImagePlus, Code, HelpCircle, BadgeCheck, Info } from 'lucide-react';
import Modal from './ui/Modal';
import { GameRole, UserRole } from '../types';
import { uploadToCloudinary, uploadBannerToCloudinary } from '../services/cloudinary';
import { BannerCropModal } from './BannerCropModal';

// Tracker Network oficial logo
const TrackerNetworkIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
  </svg>
);

// Twitch oficial logo (roxo)
const TwitchOfficialIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2H2v17h6v4l4-4h5l7-7V2h-6v7h-2V2zm8 10l-3 3h-4l-3 3v-3H7V4h12v8z"/>
  </svg>
);

interface BadgeType {
  id: string;
  name: string;
  icon: React.ReactNode;
  active: boolean;
  desc: string;
  requirement: string;
  glowColor: string; 
}

const Profile = () => {
  const { currentUser, updateProfile, themeMode, allUsers, viewProfileId, isAdmin, resetSeason, matchHistory, linkRiotAccount, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, showToast, onlineUserIds } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  // Determine which user to show
  const profileUser = (viewProfileId && viewProfileId !== currentUser.id)
    ? allUsers.find(u => u.id === viewProfileId) || currentUser 
    : currentUser;

  const isOwnProfile = profileUser.id === currentUser.id;
  
  // --- LOCAL STATE FOR EDITING ---
  // We use local state to prevent "crash on empty string" and to allow validation before saving
  const [localUsername, setLocalUsername] = useState(profileUser.username);
  const [localPrimaryRole, setLocalPrimaryRole] = useState(profileUser.primaryRole);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [isIdentityDirty, setIsIdentityDirty] = useState(false);

  const [isEditingAgents, setIsEditingAgents] = useState(false);
  const [editTopAgents, setEditTopAgents] = useState<string[]>(profileUser.topAgents);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [activeBadge, setActiveBadge] = useState<BadgeType | null>(null);
  
  // ⭐ NOVO: Estado para loading do upload de avatar e banner
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerCropFile, setBannerCropFile] = useState<File | null>(null);
  const [bannerCropObjectUrl, setBannerCropObjectUrl] = useState<string | null>(null);

  // Riot ID Linking State
  const [riotIdInput, setRiotIdInput] = useState(profileUser.riotId || '');
  const [riotTagInput, setRiotTagInput] = useState(profileUser.riotTag || '');
  const [isLinkingRiot, setIsLinkingRiot] = useState(false);
  const [riotError, setRiotError] = useState<string | null>(null);
    // Tracker / Twitch state
    const [socialModalOpen, setSocialModalOpen] = useState(false);
    const [socialModalEditingType, setSocialModalEditingType] = useState<'tracker' | 'twitch' | null>(null);
    const [trackerInput, setTrackerInput] = useState(profileUser.trackerUrl || '');
    const [twitchInput, setTwitchInput] = useState(profileUser.twitchUrl || '');
    const [socialError, setSocialError] = useState<string | null>(null);
  const [showResetSeasonModal, setShowResetSeasonModal] = useState(false);
  const [showAcceptRequestModal, setShowAcceptRequestModal] = useState(false);
  const [showRejectRequestModal, setShowRejectRequestModal] = useState(false);
  const [showRankInfoModal, setShowRankInfoModal] = useState(false);

  // Sync local state when profileUser changes (e.g. navigation or external updates)
  useEffect(() => {
    setLocalUsername(profileUser.username);
    setLocalPrimaryRole(profileUser.primaryRole);
    setIsIdentityDirty(false);
    setIdentityError(null);
    setRiotError(null);
    setAgentError(null);
        setTrackerInput(profileUser.trackerUrl || '');
        setTwitchInput(profileUser.twitchUrl || '');
  }, [profileUser.id, profileUser.username, profileUser.primaryRole]);

  // Check for changes
  useEffect(() => {
    if (!isOwnProfile) return;
    const hasChanges = localUsername !== profileUser.username || localPrimaryRole !== profileUser.primaryRole;
    setIsIdentityDirty(hasChanges);
  }, [localUsername, localPrimaryRole, profileUser.username, profileUser.primaryRole, isOwnProfile]);

  const leaderboardPosition = useMemo(() => {
    const byPoints = [...allUsers].filter(u => !u.isBot).sort((a, b) => b.points - a.points);
    const idx = byPoints.findIndex(u => u.id === profileUser.id);
    return idx === -1 ? undefined : idx + 1;
  }, [allUsers, profileUser.id]);
  const rank = getRankInfo(profileUser.points, leaderboardPosition);

  const totalGames = profileUser.wins + profileUser.losses;
  const winrate = totalGames > 0 ? ((profileUser.wins / totalGames) * 100).toFixed(1) : "0.0";
  const favoriteAgent = profileUser.topAgents[0] || 'Jett';
  const bannerUrl = profileUser.bannerUrl || AGENT_BANNERS[favoriteAgent] || AGENT_BANNERS['Jett'];
  const isOnline = !isOwnProfile && profileUser.id && onlineUserIds.has(profileUser.id);
  const isOwner = profileUser.role === 'owner';

  // XP Progress Calculation using scaling logic
  const { level: calculatedLevel, currentLevelXP, xpForNextLevel } = getLevelProgress(profileUser.xp || 0);
  const displayLevel = profileUser.level || calculatedLevel; // Fallback or sync
  const xpPercent = (currentLevelXP / xpForNextLevel) * 100;

  // --- STATS CALCULATION ---
  const userMatches = useMemo(() => {
    return matchHistory.filter(m => {
        const a = m.teamAIds || [];
        const b = m.teamBIds || [];
        return a.includes(profileUser.id) || b.includes(profileUser.id);
    });
  }, [matchHistory, profileUser.id]);

  const recentForm = useMemo(() => {
      return userMatches.slice(0, 4).map(m => {
          const a = m.teamAIds || [];
          const b = m.teamBIds || [];
          const myTeam = a.includes(profileUser.id) ? 'A' : 'B';
          return m.winner === myTeam ? 'W' : 'L';
      });
  }, [userMatches, profileUser.id]);

  const mapStats = useMemo(() => {
      const stats: Record<string, { played: number, wins: number }> = {};
      
      userMatches.forEach(m => {
          if (!stats[m.map]) stats[m.map] = { played: 0, wins: 0 };
          stats[m.map].played += 1;
          const a = m.teamAIds || [];
          const b = m.teamBIds || [];
          const myTeam = a.includes(profileUser.id) ? 'A' : 'B';
          if (m.winner === myTeam) stats[m.map].wins += 1;
      });

      return Object.entries(stats)
          .map(([map, data]) => ({
              map,
              ...data,
              winrate: data.played > 0 ? (data.wins / data.played) * 100 : 0
          }))
          .sort((a, b) => b.played - a.played) 
          .slice(0, 3); 
  }, [userMatches, profileUser.id]);

  // --- BADGE LOGIC ---
  const badges: BadgeType[] = [
    {
      id: 'veteran',
      name: 'Veteran',
      icon: <Award className="w-8 h-8 text-amber-400" />,
      active: totalGames > 20,
      desc: 'You are a seasoned veteran of the hub.',
      requirement: 'Play more than 20 matches.',
      glowColor: 'shadow-amber-400/50 bg-amber-400/10'
    },
    {
      id: 'onfire',
      name: 'On Fire',
      icon: <Flame className="w-8 h-8 text-orange-500" />,
      active: profileUser.winstreak >= 5,
      desc: 'You are absolutely crushing the competition.',
      requirement: 'Achieve a winstreak of 5 or more.',
      glowColor: 'shadow-orange-500/50 bg-orange-500/10'
    },
    {
      id: 'highroller',
      name: 'High Roller',
      icon: <Crown className="w-8 h-8 text-purple-400" />,
      active: profileUser.points >= 1200,
      desc: 'You have reached the elite ranks.',
      requirement: 'Reach Ascendant rank (1200 MMR) or higher.',
      glowColor: 'shadow-purple-400/50 bg-purple-400/10'
    },
    {
        id: 'ironwill',
        name: 'Iron Will',
        icon: <Shield className="w-8 h-8 text-blue-400" />,
        active: profileUser.losses - profileUser.wins > 3, 
        desc: 'You never give up, even when odds are against you.',
        requirement: 'Have 3 more losses than wins (Persistence).',
        glowColor: 'shadow-blue-400/50 bg-blue-400/10' 
    },
    {
        id: 'leader',
        name: 'Leader',
        icon: <ThumbsUp className="w-8 h-8 text-emerald-400" />,
        active: (profileUser.reputation || 0) > 20, 
        desc: 'The community loves playing with you.',
        requirement: 'Receive 20+ Commendations.',
        glowColor: 'shadow-emerald-400/50 bg-emerald-400/10' 
    },
    {
        id: 'og',
        name: 'OG',
        icon: <Star className="w-8 h-8 text-yellow-300" />,
        active: allUsers.findIndex(u => u.id === profileUser.id) < 10 || profileUser.username === 'txger.', 
        desc: 'You were here from the very beginning.',
        requirement: 'Be one of the first 10 registered users.',
        glowColor: 'shadow-yellow-300/50 bg-yellow-300/10'
    }
  ];

  // ⭐ CORRIGIDO: Upload real para Firebase Storage com cache-busting
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !isOwnProfile) return;
    
    const file = e.target.files[0];
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image.', 'error');
      return;
    }
    
    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image too large! Maximum 5MB.', 'error');
      return;
    }
    
    try {
      setIsUploadingAvatar(true);
      console.log('📤 Fazendo upload do avatar para Cloudinary...');
      
      // ✅ Upload para Cloudinary
      const downloadURL = await uploadToCloudinary(file);
      
      console.log('✅ Upload completo! URL:', downloadURL);
      console.log('💾 Salvando URL no Firestore (com timestamp)...');
      
      // ✅ CORREÇÃO: Salvar URL completa (COM timestamp) no Firestore
      // Isso garante que cada upload tenha URL única
      await updateProfile({ avatarUrl: downloadURL });
      
      console.log('✅ Avatar salvo no Firestore!');
      showToast('Profile photo updated successfully!', 'success');
      
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      showToast(error.message || 'Error updating photo. Try again.', 'error');
    } finally {
      setIsUploadingAvatar(false);
      // Limpar o input para permitir re-upload da mesma imagem
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !isOwnProfile) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image or GIF.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Banner too large! Maximum 8MB.', 'error');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setBannerCropFile(file);
    setBannerCropObjectUrl(objectUrl);
    bannerInputRef.current && (bannerInputRef.current.value = '');
  };

  const closeBannerCropModal = () => {
    if (bannerCropObjectUrl) URL.revokeObjectURL(bannerCropObjectUrl);
    setBannerCropFile(null);
    setBannerCropObjectUrl(null);
  };

  const handleBannerCropConfirm = async (position: string) => {
    if (!bannerCropFile) return;
    try {
      setIsUploadingBanner(true);
      const url = await uploadBannerToCloudinary(bannerCropFile);
      await updateProfile({ bannerUrl: url, bannerPosition: position });
      showToast('Banner updated!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Error updating banner.', 'error');
    } finally {
      setIsUploadingBanner(false);
      closeBannerCropModal();
    }
  };

  // --- IDENTITY SAVING ---
  // ⭐ CORRIGIDO: Adicionar async/await para salvar corretamente no Firestore
  const handleSaveIdentity = async () => {
    if (!localUsername.trim()) {
        setIdentityError("Username cannot be empty.");
        return;
    }

    // Check duplication
    const isTaken = allUsers.some(u => 
        u.id !== currentUser.id && 
        u.username.toLowerCase() === localUsername.toLowerCase()
    );

    if (isTaken) {
        setIdentityError("Username is already taken.");
        return;
    }

    setIdentityError(null);
    
    try {
      console.log('💾 Salvando username no Firestore:', localUsername);
      
      // ⭐ Await para garantir que salva no Firestore
      await updateProfile({ 
          username: localUsername,
          primaryRole: localPrimaryRole
      });
      
      console.log('✅ Username salvo no Firestore!');
      setIsIdentityDirty(false);
      
      // Feedback visual
      showToast('Name updated successfully!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar nome:', error);
      setIdentityError('Error saving. Try again.');
    }
  };

  const toggleAgent = (agent: string) => {
    setAgentError(null); // Clear error on interaction
    if (editTopAgents.includes(agent)) {
      setEditTopAgents(prev => prev.filter(a => a !== agent));
    } else {
      if (editTopAgents.length < 3) {
        setEditTopAgents(prev => [...prev, agent]);
      }
    }
  };

  const saveAgents = () => {
      if (editTopAgents.length !== 3) {
          setAgentError("Please select exactly 3 agents.");
          return;
      }
      setAgentError(null);
      updateProfile({ topAgents: editTopAgents });
      setIsEditingAgents(false);
  };

  const cancelAgentChanges = () => {
      setEditTopAgents(profileUser.topAgents);
      setAgentError(null);
      setIsEditingAgents(false);
  };

  // --- RIOT INPUT HANDLERS ---
  const handleRiotNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Max 16 characters for Riot Game Name
      const val = e.target.value.slice(0, 16);
      setRiotIdInput(val);
  };

  const handleRiotTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Remove '#' and limit to 5 characters. NO uppercase enforcement.
      let val = e.target.value.replace(/#/g, '').slice(0, 5);
      setRiotTagInput(val);
  };
  
  const handleLinkRiot = async () => {
      setRiotError(null);
      if (!riotIdInput.trim() || !riotTagInput.trim()) {
          setRiotError("Please enter both ID and Tag");
          return;
      }

      // Check Duplication
      const isTaken = allUsers.some(u => 
          u.id !== currentUser.id && 
          u.riotId?.toLowerCase() === riotIdInput.trim().toLowerCase() && 
          u.riotTag?.toLowerCase() === riotTagInput.trim().toLowerCase()
      );

      if (isTaken) {
          setRiotError("This Riot Account is already linked to another user.");
          return;
      }
      
      // Direct save without fake loading
      linkRiotAccount(riotIdInput.trim(), riotTagInput.trim());
      setIsLinkingRiot(false);
  };

  const handleResetSeason = () => {
      setShowResetSeasonModal(true);
  };

    const saveSocialLink = async () => {
        setSocialError(null);
        if (socialModalEditingType === 'tracker') {
            const v = trackerInput.trim();
            if (!v) {
                setSocialError('Link cannot be empty');
                return;
            }
            if (!v.toLowerCase().includes('tracker')) {
                setSocialError('Link must contain the word "tracker"');
                return;
            }
            try {
                await updateProfile({ trackerUrl: v, trackerAddedAt: Date.now() });
                setSocialModalOpen(false);
                setSocialModalEditingType(null);
                showToast('Tracker link saved successfully!', 'success');
            } catch (e: any) {
                setSocialError(e?.message || 'Failed to save');
            }
        } else if (socialModalEditingType === 'twitch') {
            const v = twitchInput.trim();
            if (!v) {
                setSocialError('Link cannot be empty');
                return;
            }
            if (!v.toLowerCase().includes('twitch')) {
                setSocialError('Link must contain the word "twitch"');
                return;
            }
            try {
                await updateProfile({ twitchUrl: v, twitchAddedAt: Date.now() });
                setSocialModalOpen(false);
                setSocialModalEditingType(null);
                showToast('Twitch link saved successfully!', 'success');
            } catch (e: any) {
                setSocialError(e?.message || 'Failed to save');
            }
        }
    };

    const openSocialModal = (type: 'tracker' | 'twitch') => {
        setSocialModalEditingType(type);
        setSocialError(null);
        setSocialModalOpen(true);
    };

    const closeSocialModal = () => {
        setSocialModalOpen(false);
        setSocialModalEditingType(null);
        setSocialError(null);
    };

  const confirmResetSeason = () => {
      resetSeason();
      setShowResetSeasonModal(false);
  };

  // Função para salvar os links da Twitch e TrackerNetwork no Firestore
  const handleSaveSocialLinks = async () => {
    try {
      if (!trackerInput.trim() && !twitchInput.trim()) {
        setSocialError("At least one link must be provided.");
        return;
      }

      setSocialError(null);
      console.log("💾 Salvando links no Firestore:", { trackerUrl: trackerInput, twitchUrl: twitchInput });

      // Salvar os links no Firestore
      await updateProfile({
        trackerUrl: trackerInput.trim(),
        twitchUrl: twitchInput.trim(),
      });

      showToast("Links updated successfully!", "success");
    } catch (error) {
      console.error("❌ Erro ao salvar links:", error);
      setSocialError("Error saving links. Try again.");
    }
  };

  // URLs das imagens oficiais
  const TWITCH_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/c/ce/Twitch_logo_2019.svg";
  const TRACKER_IMAGE = "https://trackernetwork.s3.amazonaws.com/branding/logos/tracker.svg";

  // Renderização dos links com ícones e edição
  const renderSocialLinks = () => (
    <div className="social-links">
      <div className="link-item">
        <img src={TWITCH_IMAGE} alt="Twitch" className="social-icon" />
        {isOwnProfile ? (
          showTwitchInput ? (
            <input
              type="text"
              value={twitchInput}
              onChange={(e) => setTwitchInput(e.target.value)}
              placeholder="Enter Twitch URL"
            />
          ) : (
            <div className="link-display">
              <a href={profileUser.twitchUrl} target="_blank" rel="noopener noreferrer">
                {profileUser.twitchUrl || 'No Twitch link'}
              </a>
              <button onClick={() => setShowTwitchInput(true)}>✏️</button>
            </div>
          )
        ) : (
          <a href={profileUser.twitchUrl} target="_blank" rel="noopener noreferrer">
            {profileUser.twitchUrl || 'No Twitch link'}
          </a>
        )}
      </div>

      <div className="link-item">
        <img src={TRACKER_IMAGE} alt="Tracker" className="social-icon" />
        {isOwnProfile ? (
          showTrackerInput ? (
            <input
              type="text"
              value={trackerInput}
              onChange={(e) => setTrackerInput(e.target.value)}
              placeholder="Enter Tracker URL"
            />
          ) : (
            <div className="link-display">
              <a href={profileUser.trackerUrl} target="_blank" rel="noopener noreferrer">
                {profileUser.trackerUrl || 'No Tracker link'}
              </a>
              <button onClick={() => setShowTrackerInput(true)}>✏️</button>
            </div>
          )
        ) : (
          <a href={profileUser.trackerUrl} target="_blank" rel="noopener noreferrer">
            {profileUser.trackerUrl || 'No Tracker link'}
          </a>
        )}
      </div>

      {isOwnProfile && (showTwitchInput || showTrackerInput) && (
        <Button onClick={handleSaveSocialLinks}>Save Links</Button>
      )}

      {socialError && <p className="error-text">{socialError}</p>}
    </div>
  );

  return (
    <>
      {/* Badge Modal (conquistas) — renderizado em document.body para ficar sempre no centro da tela */}
      {activeBadge && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center min-h-screen min-w-full bg-black/80 backdrop-blur-sm p-4" onClick={() => setActiveBadge(null)}>
              <div className="max-w-sm w-full animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                  <Card className="text-center relative overflow-hidden">
                      {/* Background Glow in Modal */}
                      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 blur-[60px] rounded-full ${activeBadge.active ? activeBadge.glowColor.split(' ')[1].replace('/10', '/40') : 'bg-transparent'}`}></div>

                      <button onClick={() => setActiveBadge(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10">
                          <X className="w-5 h-5" />
                      </button>
                      <div className="flex justify-center mb-6 mt-4 relative z-10">
                          <div className={`p-6 rounded-full transition-all duration-500 ${activeBadge.active ? `${activeBadge.glowColor} shadow-[0_0_30px_rgba(0,0,0,0)]` : 'bg-black/40 grayscale opacity-50'}`}>
                              {activeBadge.icon}
                          </div>
                      </div>
                      <h3 className={`text-2xl font-display font-bold mb-2 relative z-10 ${activeBadge.active ? 'text-white' : 'text-zinc-500'}`}>{activeBadge.name}</h3>
                      <p className="text-zinc-400 text-sm mb-6 relative z-10">{activeBadge.desc}</p>
                      
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5 relative z-10">
                          <p className="text-[10px] uppercase text-zinc-500 tracking-widest mb-1">Requirement</p>
                          <p className={`text-sm font-medium ${activeBadge.active ? 'text-white' : 'text-zinc-300'}`}>{activeBadge.requirement}</p>
                      </div>
                      
                      {!activeBadge.active && (
                          <div className="mt-4 text-xs text-zinc-500 italic relative z-10">
                              Keep playing to unlock this badge.
                          </div>
                      )}
                  </Card>
              </div>
          </div>,
          document.body
      )}

      {/* Modals fora da div animada */}
      <Modal
        isOpen={showResetSeasonModal}
        onClose={() => setShowResetSeasonModal(false)}
        title="Reset Season"
        message="ARE YOU SURE? This will reset everyone's points to 1000. This action cannot be undone."
        confirmText="Reset Season"
        cancelText="Cancel"
        onConfirm={confirmResetSeason}
        variant="danger"
      />
      <Modal
        isOpen={showAcceptRequestModal}
        onClose={() => setShowAcceptRequestModal(false)}
        title="Accept Friend Request"
        message={`Do you want to accept ${profileUser.username}'s friend request?`}
        confirmText="Accept"
        cancelText="Cancel"
        onConfirm={() => {
          acceptFriendRequest(profileUser.id);
          setShowAcceptRequestModal(false);
        }}
        variant="info"
      />
      <Modal
        isOpen={showRejectRequestModal}
        onClose={() => setShowRejectRequestModal(false)}
        title="Reject Friend Request"
        message={`Do you want to reject ${profileUser.username}'s friend request?`}
        confirmText="Reject"
        cancelText="Cancel"
        onConfirm={() => {
          rejectFriendRequest(profileUser.id);
          setShowRejectRequestModal(false);
        }}
        variant="warning"
      />

      <RankRequirementsModal isOpen={showRankInfoModal} onClose={() => setShowRankInfoModal(false)} themeMode={themeMode} />

      <BannerCropModal
        isOpen={!!bannerCropObjectUrl}
        onClose={closeBannerCropModal}
        imageUrl={bannerCropObjectUrl || ''}
        onConfirm={handleBannerCropConfirm}
        themeMode={themeMode}
      />

      {/* Social Links Modal */}
      {createPortal(
        <div className={`${socialModalOpen ? 'fixed' : 'hidden'} inset-0 z-[9999] flex items-center justify-center min-h-screen min-w-full bg-black/80 backdrop-blur-sm p-4`} onClick={closeSocialModal}>
          <div className="max-w-md w-full animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className={`relative rounded-3xl overflow-hidden shadow-2xl border ${themeMode === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200'}`}>
              <div className={`p-6 space-y-6`}>
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {socialModalEditingType === 'tracker' ? (
                      <>
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50">
                          <TrackerNetworkIcon className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className={`text-2xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Tracker Network</h2>
                      </>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500/50">
                          <TwitchOfficialIcon className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className={`text-2xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Twitch</h2>
                      </>
                    )}
                  </div>
                  <button 
                    onClick={closeSocialModal}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Description */}
                <div className={`text-sm ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {socialModalEditingType === 'tracker' ? (
                    <p>Enter your Tracker Network profile link. It must contain the word "tracker".</p>
                  ) : (
                    <p>Enter your Twitch channel link or profile. It must contain the word "twitch".</p>
                  )}
                </div>

                {/* Input */}
                <input
                  type="text"
                  placeholder={socialModalEditingType === 'tracker' ? 'https://tracker.gg/valorant/profile/...' : 'https://twitch.tv/yourname'}
                  value={socialModalEditingType === 'tracker' ? trackerInput : twitchInput}
                  onChange={(e) => socialModalEditingType === 'tracker' ? setTrackerInput(e.target.value) : setTwitchInput(e.target.value)}
                  className={`w-full rounded-xl p-3 border outline-none focus:ring-2 ${themeMode === 'dark' ? 'bg-black/40 border-white/10 text-white focus:ring-blue-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:ring-blue-400'}`}
                />

                {/* Error Message */}
                {socialError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <p className="text-sm text-rose-400">{socialError}</p>
                  </div>
                )}

                {/* Helper Text */}
                <div className={`text-xs ${themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-500'} bg-white/5 rounded-lg p-3 border border-white/10`}>
                  <p className="font-semibold mb-1">Make sure your link contains:</p>
                  <p>✓ {socialModalEditingType === 'tracker' ? '"tracker"' : '"twitch"'}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="ghost" 
                    className="flex-1"
                    onClick={closeSocialModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    onClick={saveSocialLink}
                  >
                    Save Link
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Hero Banner */}
      <div className={`relative rounded-3xl overflow-hidden min-h-[300px] md:min-h-[250px] shadow-2xl ${themeMode === 'dark' ? 'border border-white/5' : 'border border-zinc-200'}`}>
        <div 
            className="absolute inset-0 bg-cover bg-no-repeat opacity-40 transform scale-105 transition-transform duration-1000"
            style={{ 
              backgroundImage: `url(${bannerUrl})`,
              backgroundPosition: profileUser.bannerPosition || '50% 50%'
            }}
        ></div>
        <div className={`absolute inset-0 ${themeMode === 'dark' ? 'bg-gradient-to-b from-transparent via-black/40 to-black/90' : 'bg-gradient-to-b from-transparent via-white/20 to-white/60'}`}></div>
        {isOwnProfile && (
          <div className="absolute top-4 right-4 z-20">
            <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleBannerChange} />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="p-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white disabled:opacity-50 flex items-center gap-2 shadow-lg border border-white/10"
            >
              {isUploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
              <span className="text-xs font-medium">Change banner</span>
            </button>
          </div>
        )}

                {/* Social icons: tracker / twitch - appear bottom-right */}
                <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
                    {/* Tracker Link */}
                    {profileUser.trackerUrl ? (
                        <div className="relative group">
                            <a 
                                href={profileUser.trackerUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border border-blue-400/50 hover:from-blue-500/50 hover:to-cyan-500/50 hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-blue-500/40"
                                title="Tracker Network"
                            >
                                <TrackerNetworkIcon className="w-6 h-6 text-blue-300" />
                            </a>
                            {isOwnProfile && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); openSocialModal('tracker'); }}
                                    className="absolute -top-2 -right-2 bg-white/20 rounded-full p-1.5 border border-white/30 hover:bg-white/40 transition-all shadow-lg"
                                    title="Edit Tracker link"
                                >
                                    <Edit2 className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    ) : isOwnProfile ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); openSocialModal('tracker'); }}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-110"
                            title="Add Tracker link"
                        >
                            <span className="text-white font-bold text-xl">+</span>
                        </button>
                    ) : null}

                    {/* Twitch Link */}
                    {profileUser.twitchUrl ? (
                        <div className="relative group">
                            <a 
                                href={profileUser.twitchUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-purple-600/30 to-pink-600/30 border border-purple-500/50 hover:from-purple-600/50 hover:to-pink-600/50 hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-purple-500/40"
                                title="Twitch"
                            >
                                <TwitchOfficialIcon className="w-6 h-6 text-purple-300" />
                            </a>
                            {isOwnProfile && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); openSocialModal('twitch'); }}
                                    className="absolute -top-2 -right-2 bg-white/20 rounded-full p-1.5 border border-white/30 hover:bg-white/40 transition-all shadow-lg"
                                    title="Edit Twitch link"
                                >
                                    <Edit2 className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>
                    ) : isOwnProfile ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); openSocialModal('twitch'); }}
                            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300 hover:scale-110"
                            title="Add Twitch link"
                        >
                            <span className="text-white font-bold text-xl">+</span>
                        </button>
                    ) : null}
                </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6 z-10">
            <div className="relative group">
                <div className={`w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center ${themeMode === 'dark' ? 'bg-zinc-800 border-4 border-black/50' : 'bg-zinc-200 border-4 border-white'}`}>
                    {profileUser.avatarUrl ? (
                        <img src={profileUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-display font-bold text-white/20">{profileUser.username.substring(0,2).toUpperCase()}</span>
                    )}
                </div>
                {isOwnProfile && (
                    <>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isUploadingAvatar}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl cursor-pointer disabled:cursor-not-allowed"
                        >
                            {isUploadingAvatar ? (
                                <Loader2 className="text-white w-8 h-8 animate-spin" />
                            ) : (
                                <Camera className="text-white w-8 h-8" />
                            )}
                        </button>
                    </>
                )}
            </div>

            <div className="mb-2 w-full flex-1 min-w-0">
                {/* Name + verified + staff badge + online (compact) */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white shadow-black drop-shadow-lg truncate max-w-full">{profileUser.username}</h1>
                    {!isOwner && profileUser.verified && (
                      <span className="flex-shrink-0 text-blue-400" title="Verified">
                        <BadgeCheck className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      </span>
                    )}
                    {profileUser.role === 'owner' && (
                      <span className="flex-shrink-0 text-amber-400" title="Owner">
                        <Crown className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      </span>
                    )}
                    {profileUser.role === 'mod' && (
                      <span className="flex-shrink-0 text-amber-300" title="Moderator">
                        <Shield className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      </span>
                    )}
                    {profileUser.role === 'dev' && (
                      <span className="flex-shrink-0 text-violet-400" title="Developer">
                        <Code className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      </span>
                    )}
                    {profileUser.role === 'helper' && (
                      <span className="flex-shrink-0 text-emerald-400" title="Helper">
                        <HelpCircle className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      </span>
                    )}
                    {!isOwnProfile && (
                      <span className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase ${isOnline ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-600/50 text-zinc-400 border border-white/10'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    )}
                </div>
                <div className="flex space-x-4 text-sm text-zinc-400 font-medium mb-3">
                    <span>{profileUser.primaryRole}</span>
                    <span className="text-zinc-600">•</span>
                    <span>{profileUser.secondaryRole}</span>
                </div>

                {/* Rank + Riot ID (separate row, no level here) */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                        <span 
                            className="px-3 py-1 rounded-full text-xs font-bold text-white uppercase border border-white/20 shadow-lg flex-shrink-0"
                            style={{ backgroundColor: rank.color, textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                        >
                            {rank.name}
                        </span>
                        <button
                            onClick={() => setShowRankInfoModal(true)}
                            className="p-1 rounded-full hover:bg-white/10 transition-colors"
                            title="View rank requirements"
                        >
                            <Info className="w-3.5 h-3.5 text-zinc-400 hover:text-white" />
                        </button>
                    </div>
                    {profileUser.riotId && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-600/20 border border-rose-500/30 text-rose-300 flex-shrink-0 flex items-center gap-1">
                            {profileUser.riotId}#{profileUser.riotTag}
                            <CheckCircle className="w-3 h-3" />
                        </span>
                    )}
                </div>

                {/* XP bar with level below */}
                <div className="flex flex-col w-full md:max-w-xs mb-2">
                    <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-1">
                         <span>XP Progress</span>
                         <span>{currentLevelXP} / {xpForNextLevel}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${xpPercent}%` }}></div>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mt-1">Level {displayLevel}</p>
                </div>

                {/* Add Friend / Friend status (when viewing someone else's profile) */}
                {!isOwnProfile && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {currentUser.friends?.includes(profileUser.id) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Friends
                            </span>
                        ) : currentUser.friendRequests?.some(r => r.fromId === profileUser.id) ? (
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => setShowAcceptRequestModal(true)} className="bg-emerald-600 hover:bg-emerald-500">
                                    Accept Request
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowRejectRequestModal(true)} className="text-zinc-400 hover:text-white">
                                    Reject
                                </Button>
                            </div>
                        ) : profileUser.friendRequests?.some(r => r.fromId === currentUser.id) ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-700/50 border border-white/10 text-zinc-400 text-sm">
                                Request sent
                            </span>
                        ) : (
                            <Button size="sm" onClick={() => sendFriendRequest(profileUser.id)} className="inline-flex items-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                Add Friend
                            </Button>
                        )}
                    </div>
                )}
            </div>
            
            {/* Admin Reset Button */}
            {isAdmin && isOwnProfile && (
                <div className="ml-auto mb-2">
                    <Button variant="danger" size="sm" onClick={handleResetSeason}>
                        [Admin] Reset Season
                    </Button>
                </div>
            )}
        </div>
      </div>

      {/* Quick Stats Row - Fixed Light Mode Colors */}
      <div className="grid grid-cols-3 gap-4">
        <Card noPadding className={`p-4 flex flex-col items-center justify-center ${themeMode === 'dark' ? 'bg-black/40' : 'bg-white/40'}`}>
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">MMR</span>
            <span className={`text-2xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{Math.floor(profileUser.points)}</span>
        </Card>
        <Card noPadding className={`p-4 flex flex-col items-center justify-center ${themeMode === 'dark' ? 'bg-black/40' : 'bg-white/40'}`}>
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Winrate</span>
            <span className={`text-2xl font-display font-bold ${Number(winrate) > 50 ? 'text-emerald-400' : (themeMode === 'dark' ? 'text-zinc-200' : 'text-zinc-900')}`}>{winrate}%</span>
        </Card>
        <Card noPadding className={`p-4 flex flex-col items-center justify-center ${themeMode === 'dark' ? 'bg-black/40' : 'bg-white/40'}`}>
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Games Played</span>
            <span className={`text-2xl font-display font-bold ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{totalGames}</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Identity, Riot Link, Agent Pool */}
        <div className="space-y-6">
            
            {/* Identity */}
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-2 text-zinc-400">
                        <UserIcon className="w-5 h-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Player Identity</h3>
                    </div>
                    {isOwnProfile && isIdentityDirty && (
                        <Button size="sm" onClick={handleSaveIdentity} className="animate-in fade-in zoom-in">
                            Save Identity
                        </Button>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase mb-2">Username</label>
                        <input 
                            type="text" 
                            value={localUsername}
                            readOnly={!isOwnProfile}
                            onChange={(e) => isOwnProfile && setLocalUsername(e.target.value)}
                            className={`w-full rounded-xl p-3 border outline-none ${themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'} ${isOwnProfile ? 'focus:border-rose-500' : 'cursor-default opacity-70'}`}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase mb-2">Primary Role</label>
                        <select 
                            value={localPrimaryRole}
                            disabled={!isOwnProfile}
                            onChange={(e) => isOwnProfile && setLocalPrimaryRole(e.target.value as GameRole)}
                            className={`w-full rounded-xl p-3 border outline-none appearance-none ${themeMode === 'dark' ? 'bg-zinc-900 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'} ${!isOwnProfile ? 'cursor-default opacity-70' : 'focus:border-rose-500'}`}
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
                {identityError && (
                    <div className="mt-4 flex items-center text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
                        <AlertTriangle className="w-3 h-3 mr-2" />
                        {identityError}
                    </div>
                )}
            </Card>

            {/* Riot ID Linking (Own Profile Only) */}
            {isOwnProfile && (
                <Card>
                     <div className="flex justify-between items-center mb-4">
                         <div className="flex items-center space-x-2 text-zinc-400">
                             <LinkIcon className="w-5 h-5" />
                             <h3 className="text-sm font-bold uppercase tracking-widest">Riot Account</h3>
                         </div>
                         {!profileUser.riotId && !isLinkingRiot && (
                             <Button size="sm" onClick={() => setIsLinkingRiot(true)}>Link Account</Button>
                         )}
                     </div>

                     {profileUser.riotId && !isLinkingRiot ? (
                         <div className={`flex items-center justify-between p-4 rounded-xl border ${themeMode === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                             <span className={`${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'} font-bold text-lg`}>{profileUser.riotId}<span className="text-zinc-500">#{profileUser.riotTag}</span></span>
                             <span className="text-xs text-emerald-500 font-bold uppercase flex items-center bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3 ml-1"/> Verified
                             </span>
                         </div>
                     ) : (
                         isLinkingRiot ? (
                             <div className="flex flex-col space-y-4">
                                 <p className="text-sm text-zinc-500">
                                     Enter your Riot ID exactly as it appears in-game.
                                 </p>
                                 <div className="flex items-center gap-2">
                                     <div className="flex-1 relative">
                                        <input 
                                            placeholder="Game Name" 
                                            className={`w-full border rounded-xl p-3 outline-none focus:border-rose-500 transition-colors ${themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'}`}
                                            value={riotIdInput}
                                            onChange={handleRiotNameChange}
                                        />
                                        <span className="absolute right-2 top-3 text-[10px] text-zinc-600">{riotIdInput.length}/16</span>
                                     </div>
                                     <span className="text-zinc-500 font-bold text-xl">#</span>
                                     <div className="w-28 relative">
                                        <input 
                                            placeholder="Tag" 
                                            className={`w-full border rounded-xl p-3 outline-none focus:border-rose-500 transition-colors ${themeMode === 'dark' ? 'bg-black/20 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-black'}`}
                                            value={riotTagInput}
                                            onChange={handleRiotTagChange}
                                        />
                                        <span className="absolute right-2 top-3 text-[10px] text-zinc-600">{riotTagInput.length}/5</span>
                                     </div>
                                 </div>

                                 {riotError && (
                                    <div className="flex items-center text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
                                        <AlertTriangle className="w-3 h-3 mr-2" />
                                        {riotError}
                                    </div>
                                 )}

                                 <div className="flex gap-2">
                                     <Button variant="ghost" className="flex-1" onClick={() => setIsLinkingRiot(false)}>Cancel</Button>
                                     <Button className="flex-1" onClick={handleLinkRiot}>
                                         Save ID
                                     </Button>
                                 </div>
                             </div>
                         ) : (
                             <p className="text-sm text-zinc-500 italic">No Riot Account linked. You must link an account to play.</p>
                         )
                     )}
                </Card>
            )}

            {/* Agent Pool */}
            <Card className="h-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Agent Pool</h3>
                    {isOwnProfile && !isEditingAgents && (
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                                setEditTopAgents(profileUser.topAgents);
                                setAgentError(null);
                                setIsEditingAgents(true);
                            }}
                        >
                            <Edit2 className="w-3 h-3" />
                        </Button>
                    )}
                    {isEditingAgents && (
                        <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={cancelAgentChanges}>
                                <X className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="primary" onClick={saveAgents}>
                                <Save className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>
                
                {!isEditingAgents ? (
                    <div className="grid grid-cols-1 gap-3">
                        {profileUser.topAgents.map((agent, index) => (
                            <div key={agent} className={`relative overflow-hidden rounded-xl border p-3 flex items-center transition-all ${themeMode === 'dark' ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-black/5 bg-black/5 hover:bg-black/10'}`}>
                                <img src={AGENT_IMAGES[agent]} alt={agent} className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 object-cover mr-4" />
                                <div>
                                    <span className={`block text-sm font-bold ${themeMode === 'dark' ? 'text-white' : 'text-zinc-900'}`}>{agent}</span>
                                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{index === 0 ? 'Main' : 'Pick'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col space-y-4">
                        <span className="text-xs text-rose-500 font-bold uppercase">{editTopAgents.length}/3 Selected</span>
                        <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {AGENTS.map(agent => (
                                <button
                                    key={agent}
                                    onClick={() => toggleAgent(agent)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-200 aspect-square 
                                        ${editTopAgents.includes(agent) 
                                            ? `bg-rose-500/20 border-rose-500` 
                                            : `border-transparent ${themeMode === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10'}`}
                                    `}
                                >
                                    <img src={AGENT_IMAGES[agent]} alt={agent} className="w-8 h-8 rounded-full mb-1" />
                                    <span className={`text-[9px] font-bold ${editTopAgents.includes(agent) ? 'text-rose-400' : 'text-zinc-500'}`}>{agent}</span>
                                </button>
                            ))}
                        </div>
                        {agentError && (
                            <div className="mt-4 flex items-center text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg">
                                <AlertTriangle className="w-3 h-3 mr-2" />
                                {agentError}
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>

        {/* Right Column: Recent Form & Maps */}
        <div className="space-y-6 h-full flex flex-col">
            
            {/* Recent Form */}
            <Card>
                <div className="flex items-center space-x-2 mb-6 text-zinc-400">
                    <Activity className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Recent Form</h3>
                </div>
                <div className="flex items-center justify-center gap-4">
                    {recentForm.length > 0 ? (
                        recentForm.map((result, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-300 hover:scale-110 ${result === 'W' ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'}`}>
                                    {result}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-full text-center text-zinc-500 text-sm italic py-2">
                            Play matches to see form.
                        </div>
                    )}
                </div>
            </Card>

            {/* Map Statistics */}
            <Card className="flex-1">
                <div className="flex items-center space-x-2 mb-6 text-zinc-400">
                    <MapIcon className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Most Played Maps</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {mapStats.length > 0 ? (
                        mapStats.map(stat => (
                            <div key={stat.map} className="relative h-24 rounded-xl overflow-hidden group border border-white/5">
                                <div 
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 opacity-60"
                                    style={{ backgroundImage: `url(${MAP_IMAGES[stat.map as keyof typeof MAP_IMAGES]})` }}
                                ></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 p-3 w-full">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="block text-xs font-bold text-white uppercase tracking-wider">{stat.map}</span>
                                            <span className="text-[10px] text-zinc-400">{stat.wins}W - {stat.played - stat.wins}L</span>
                                        </div>
                                        <div className={`text-lg font-bold font-mono ${stat.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {stat.winrate.toFixed(0)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4 text-zinc-500 text-sm italic">
                            No match data available yet.
                        </div>
                    )}
                </div>
            </Card>
        </div>

      </div>

      {/* Badges Section - Larger Size */}
      <Card>
        <div className="text-center mb-6">
            <h3 className={`text-sm font-bold uppercase tracking-widest ${themeMode === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}`}>Achievements</h3>
            <p className={`text-[10px] uppercase tracking-widest mt-1 ${themeMode === 'dark' ? 'text-zinc-600' : 'text-zinc-500'}`}>Click for details</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {badges.map(badge => (
                <button 
                    key={badge.id}
                    onClick={() => setActiveBadge(badge)}
                    className={`
                        flex flex-col items-center justify-center p-6 rounded-3xl border transition-all duration-300 text-center
                        ${badge.active 
                            ? `${themeMode === 'dark' ? 'bg-gradient-to-b from-white/10 to-white/5 border-white/20 hover:bg-white/10' : 'bg-gradient-to-b from-zinc-50 to-white border-zinc-300 hover:bg-zinc-50'} hover:scale-105` 
                            : `${themeMode === 'dark' ? 'bg-transparent border-white/5 opacity-40' : 'bg-zinc-100/50 border-zinc-200 opacity-60'} grayscale hover:opacity-60 hover:scale-105 cursor-pointer`}
                    `}
                >
                    <div className={`p-4 rounded-full mb-3 transition-shadow duration-300 ${badge.active ? `${badge.glowColor} shadow-[0_0_10px_rgba(0,0,0,0)]` : themeMode === 'dark' ? 'bg-white/5' : 'bg-zinc-200'}`}>
                        {React.cloneElement(badge.icon as React.ReactElement<{ className?: string }>, { 
                            className: `w-8 h-8 ${badge.active ? (themeMode === 'dark' ? 'text-white' : 'text-zinc-900') : (themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}` 
                        })}
                    </div>
                    <span className={`text-sm font-bold truncate w-full ${badge.active ? (themeMode === 'dark' ? 'text-white' : 'text-zinc-900') : (themeMode === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}`}>{badge.name}</span>
                </button>
            ))}
        </div>
      </Card>

      </div>
    </>
  );
};

export default Profile;
