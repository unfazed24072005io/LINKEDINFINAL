'use client';
import { useState } from 'react';
import { 
  Search, Download, User, MapPin, Building, Mail, Phone, 
  Zap, Shield, Sparkles, Crown, CheckCircle, Users
} from 'lucide-react';

export default function Home() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apolloLoading, setApolloLoading] = useState(false);
   const [searchData, setSearchData] = useState({
    designation: '',
    location: '',
    industry: 'all', // Add industry field
    leadCount: 10
  });
// Industry options - COMPLETE LIST
const industryOptions = [
  { value: 'all', label: 'All Industries' },
  { value: 'recruitment', label: 'Recruitment & Staffing' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'education', label: 'Education' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'energy', label: 'Energy & Utilities' },
  { value: 'transportation', label: 'Transportation & Logistics' },
  { value: 'hospitality', label: 'Hospitality & Tourism' },
  { value: 'entertainment', label: 'Media & Entertainment' },
  { value: 'telecom', label: 'Telecommunications' },
  { value: 'biotech', label: 'Biotechnology & Pharma' },
  { value: 'construction', label: 'Construction' },
  { value: 'agriculture', label: 'Agriculture & Food' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'aerospace', label: 'Aerospace & Defense' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'nonprofit', label: 'Non-Profit' },
  { value: 'government', label: 'Government' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'hr', label: 'Human Resources' }
];

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!searchData.designation || !searchData.location) return;
    
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchData),
      });

      const data = await response.json();
      if (data.success) {
        setProfiles(data.profiles);
      } else {
        alert(`Error: ${data.error}${data.note ? '\n' + data.note : ''}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApolloEnrichment = async () => {
    if (!profiles.length) return;
    
    setApolloLoading(true);
    try {
      const response = await fetch('/.netlify/functions/apollo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profiles }),
      });

      const data = await response.json();
      if (data.success) {
        setProfiles(data.profiles);
        if (data.note) {
          console.log('Note:', data.note);
          // Show success message with note
          if (data.note.includes('Add APOLLO_API_KEY')) {
            alert('Demo contact data loaded! Add Apollo API key for real contact details.');
          }
        }
      } else {
        alert(`Apollo enrichment failed: ${data.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setApolloLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!profiles.length) return;
    
    const headers = ['Name', 'Title', 'Location', 'Company', 'Email', 'Phone', 'Profile URL', 'Status'];
    const csvData = profiles.map(p => [
      p.name, 
      p.title, 
      p.location, 
      p.company, 
      p.verifiedEmail || 'Not available', 
      p.directPhone || 'Not available', 
      p.profileUrl,
      p.apolloEnriched ? 'Contact Enriched' : 'Basic Profile'
    ]);
    const csvContent = [headers, ...csvData].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${searchData.designation}_${searchData.location}_${Date.now()}.csv`;
    a.click();
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  const leadCountOptions = [5, 10, 20, 50];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">ProspectFind</h1>
                <p className="text-sm text-cyan-200">Lead Generation Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-cyan-200">
                <Shield className="h-4 w-4" />
                <span className="text-sm">Secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 glass rounded-2xl px-4 py-2 mb-6">
            <Zap className="h-4 w-4 text-cyan-300" />
            <span className="text-cyan-200 text-sm font-medium">Contact Enrichment</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Generate <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text">Quality Leads</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Find LinkedIn profiles and get verified contact information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          
          {/* Search Panel */}
          <div className="lg:col-span-1">
            <div className="glass rounded-2xl p-6 sticky top-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Search Criteria</h2>
                <p className="text-sm text-gray-300">Find targeted leads</p>
              </div>

              <form onSubmit={handleScrape} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={searchData.designation}
                    onChange={(e) => setSearchData({...searchData, designation: e.target.value})}
                    placeholder="e.g., CEO, Marketing Manager"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={searchData.location}
                    onChange={(e) => setSearchData({...searchData, location: e.target.value})}
                    placeholder="e.g., New York, London"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-400"
                  />
                </div>
 <div>
    <label className="block text-sm font-medium text-cyan-200 mb-2">
      Industry
    </label>
    <select
      value={searchData.industry}
      onChange={(e) => setSearchData({...searchData, industry: e.target.value})}
      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
    >
      {industryOptions.map(option => (
        <option key={option.value} value={option.value} className="bg-slate-800">
          {option.label}
        </option>
      ))}
    </select>
  </div>

                <div>
                  <label className="block text-sm font-medium text-cyan-200 mb-2">
                    Number of Leads
                  </label>
                  <select
                    value={searchData.leadCount}
                    onChange={(e) => setSearchData({...searchData, leadCount: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
                  >
                    {leadCountOptions.map(count => (
                      <option key={count} value={count} className="bg-slate-800">
                        {count} leads
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !searchData.designation || !searchData.location}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Finding {searchData.leadCount} Leads...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Search className="h-4 w-4 mr-2" />
                      Find {searchData.leadCount} Leads
                    </div>
                  )}
                </button>
              </form>

              {profiles.length > 0 && (
                <div className="space-y-3 mt-6">
                  <button
                    onClick={handleApolloEnrichment}
                    disabled={apolloLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {apolloLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Getting Contacts...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        Get Contact Details
                      </div>
                    )}
                  </button>

                  <button
                    onClick={exportToCSV}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 px-4 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export {profiles.length} Leads
                  </button>

                  <div className="text-center text-sm text-gray-300 pt-2 border-t border-white/10">
                    {profiles.filter(p => p.apolloEnriched).length} of {profiles.length} leads enriched
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-3">
            {profiles.length > 0 ? (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/20 bg-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Generated Leads
                      </h3>
                      <p className="text-sm text-gray-300 mt-1">
                        {profiles.length} profiles found • 
                        <span className="text-green-400 ml-1">
                          {profiles.filter(p => p.apolloEnriched).length} with contact details
                        </span>
                      </p>
                    </div>
                    <span className="bg-cyan-500/20 text-cyan-300 text-sm px-3 py-1 rounded-full">
                      {searchData.leadCount} requested
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {profiles.map((profile) => (
                    <div key={profile.id} className="p-6 hover:bg-white/5 transition-all">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                          {profile.apolloEnriched && (
                            <div className="flex justify-center mt-2" title="Contact Enriched">
                              <Crown className="h-4 w-4 text-yellow-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
<div className="flex items-center space-x-2 mb-2">
        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
          {profile.industry || 'general'}
        </span>
        {profile.relevanceScore > 7 && (
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full border border-green-500/30">
            High Match
          </span>
        )}
      </div>
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-bold text-white">
                                  {profile.name}
                                </h4>
                                {profile.confidence && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(profile.confidence)}`}>
                                    {profile.confidence} confidence
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-3">
                                <div className="flex items-center">
                                  <Building className="h-4 w-4 mr-2" />
                                  <span>{profile.title}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="h-4 w-4 mr-2" />
                                  <span>{profile.location}</span>
                                </div>
                              </div>

                              {/* Contact Information */}
                              <div className="space-y-3 mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Email */}
                                  <div className={`flex items-center space-x-3 ${profile.verifiedEmail ? 'text-green-400' : 'text-gray-400'}`}>
                                    <Mail className="h-5 w-5 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium">Email</div>
                                      <div className="text-sm truncate">
                                        {profile.verifiedEmail || 'Not available'}
                                      </div>
                                    </div>
                                    {profile.verifiedEmail && <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />}
                                  </div>

                                  {/* Phone */}
                                  <div className={`flex items-center space-x-3 ${profile.directPhone ? 'text-blue-400' : 'text-gray-400'}`}>
                                    <Phone className="h-5 w-5 flex-shrink-0" />
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium">Phone</div>
                                      <div className="text-sm">
                                        {profile.directPhone || 'Not available'}
                                      </div>
                                    </div>
                                    {profile.directPhone && <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />}
                                  </div>
                                </div>
                              </div>

                              {/* Enrichment Status */}
                              {!profile.apolloEnriched && (
                                <div className="flex items-center space-x-2 mt-3 p-3 bg-orange-500/10 rounded border border-orange-500/20">
                                  <Zap className="h-4 w-4 text-orange-400" />
                                  <span className="text-sm text-orange-300">
                                    Click "Get Contact Details" to find email and phone
                                  </span>
                                </div>
                              )}
                            </div>

                            <a 
                              href={profile.profileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ml-4"
                            >
                              <User className="h-4 w-4" />
                              <span>LinkedIn</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
                  <Search className="h-8 w-8 text-cyan-300" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Ready to Generate Leads</h3>
                <p className="text-gray-300 mb-6">Enter search criteria to find professional leads with contact information</p>
                <div className="flex items-center justify-center space-x-4 text-cyan-200">
                  <div className="flex items-center space-x-1">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">Secure</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Fast</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Targeted</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}