
import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Home, BarChart2, Monitor, LogOut, History, Moon, Sun, Menu, X, ShieldAlert, Target, Users } from 'lucide-react';
import Button from './ui/Button';

interface LayoutProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, children }) => {
  const { isAuthenticated, logout, themeMode, toggleTheme, matchState, currentUser, isAdmin, setViewProfileId } = useGame();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Calculate pending friend requests
  const friendRequestCount = currentUser.friendRequests ? currentUser.friendRequests.length : 0;

  const navItems = [
    { id: 'queue', icon: Home, label: 'Hub' },
    { id: 'leaderboard', icon: BarChart2, label: 'Rankings' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'quests', icon: Target, label: 'Quests' },
    { id: 'friends', icon: Users, label: 'Friends' },
  ];

  if (isAdmin) {
      navItems.push({ id: 'reports', icon: ShieldAlert, label: 'Reports' });
  }

  const handleProfileClick = () => {
      setCurrentView('profile');
      setViewProfileId(null); // Reset to show own profile
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${themeMode === 'dark' ? 'bg-[#050505] text-zinc-200' : 'bg-zinc-50 text-zinc-800'}`}>
      
      {/* Top Header */}
      <header className={`h-20 border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-50 backdrop-blur-md ${themeMode === 'dark' ? 'bg-black/60 border-white/5' : 'bg-white/60 border-black/5'}`}>
         
         <div className="flex items-center space-x-4 lg:space-x-8">
            {isAuthenticated && (
                <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            )}

            <div className="flex items-center cursor-pointer" onClick={() => isAuthenticated && setCurrentView('queue')}>
                <Monitor className="w-6 h-6 text-rose-500" />
                <span className={`ml-3 font-display font-bold text-xl tracking-tight hidden sm:block ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                    HUB-PT
                </span>
                {matchState && matchState.phase !== 'FINISHED' && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] uppercase font-bold animate-pulse">
                        Match Live
                    </span>
                )}
            </div>

            {isAuthenticated && (
                <nav className="hidden md:flex items-center space-x-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`
                                flex items-center px-4 py-2 rounded-2xl transition-all duration-200 text-sm font-medium relative
                                ${currentView === item.id 
                                    ? 'bg-rose-500/10 text-rose-500' 
                                    : 'text-zinc-500 hover:text-rose-500'}
                            `}
                        >
                            <item.icon className="w-4 h-4 mr-2" />
                            {item.label}
                            
                            {/* Friend Request Badge (Desktop) */}
                            {item.id === 'friends' && friendRequestCount > 0 && (
                                <span className="ml-2 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full grid place-items-center leading-none animate-pulse">
                                    {friendRequestCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            )}
         </div>

         <div className="flex items-center space-x-2 sm:space-x-4">
             <button 
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-colors ${themeMode === 'dark' ? 'bg-white/5 hover:bg-white/10 text-zinc-400' : 'bg-black/5 hover:bg-black/10 text-zinc-600'}`}
             >
                {themeMode === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>

             {isAuthenticated && (
                <>
                    {/* User Profile Area */}
                    <button 
                        onClick={handleProfileClick}
                        className={`flex items-center space-x-2 pl-2 pr-4 py-1.5 rounded-full border transition-all
                            ${currentView === 'profile' 
                                ? 'border-rose-500 bg-rose-500/10' 
                                : `border-transparent hover:bg-white/5 ${themeMode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`
                            }
                        `}
                    >
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 text-white">
                            {currentUser.avatarUrl ? (
                                <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold">{currentUser.username[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div className="hidden sm:block text-left">
                            <span className={`text-sm font-medium block ${themeMode === 'dark' ? 'text-white' : 'text-black'}`}>
                                {currentUser.username}
                            </span>
                            <span className="text-[10px] text-zinc-500 block -mt-1">Lvl {currentUser.level || 1}</span>
                        </div>
                    </button>

                    <Button variant="ghost" size="sm" onClick={logout} className="flex items-center">
                        <LogOut className="w-4 h-4" />
                    </Button>
                 </>
             )}
         </div>

         {/* Mobile Menu Dropdown */}
         {mobileMenuOpen && isAuthenticated && (
            <div className={`absolute top-20 left-0 w-full border-b shadow-2xl md:hidden animate-in slide-in-from-top-2 z-40 ${themeMode === 'dark' ? 'bg-[#0a0a0a] border-white/10' : 'bg-white border-black/5'}`}>
                <nav className="flex flex-col p-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setCurrentView(item.id);
                                setMobileMenuOpen(false);
                            }}
                            className={`
                                flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
                                ${currentView === item.id 
                                    ? 'bg-rose-500/10 text-rose-500' 
                                    : 'text-zinc-500'}
                            `}
                        >
                            <div className="flex items-center">
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </div>

                            {/* Friend Request Badge (Mobile) */}
                            {item.id === 'friends' && friendRequestCount > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {friendRequestCount}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
         )}

      </header>

      {/* Main Content - Reduced Padding to help fixed height calc */}
      <main className="flex-1 relative w-full max-w-7xl mx-auto p-4 lg:py-8 lg:px-12">
        {/* Background Gradients */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
             {themeMode === 'dark' && (
                 <>
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-rose-900/10 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-zinc-900/5 blur-[150px] rounded-full"></div>
                 </>
             )}
        </div>

        <div className="relative z-10">
            {children}
        </div>
      </main>

    </div>
  );
};

export default Layout;
