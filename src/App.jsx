import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [recipes, setRecipes] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [ingredientsModalRecipe, setIngredientsModalRecipe] = useState(null)
  const [showAmount, setShowAmount] = useState(false)

  // 1. 상태 분리: 필터(도마) vs 냉장고(창고)
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([]) 
  const [searchTags, setSearchTags] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1) 

  const [myFridge, setMyFridge] = useState(() => {
    const saved = localStorage.getItem('yoneodoo_real_fridge')
    return saved ? JSON.parse(saved) : []
  })
  const [isFridgeOpen, setIsFridgeOpen] = useState(false)
  const [fridgeSearchTerm, setFridgeSearchTerm] = useState('')
  const [fridgeSuggestions, setFridgeSuggestions] = useState([])
  const [fridgeSelectedIndex, setFridgeSelectedIndex] = useState(-1) 

  // 2. 요리 완료 팝업 상태 관리
  const [finishedRecipe, setFinishedRecipe] = useState(null)
  const [selectedToEmpty, setSelectedToEmpty] = useState([])

  useEffect(() => {
    localStorage.setItem('yoneodoo_real_fridge', JSON.stringify(myFridge))
  }, [myFridge])

  useEffect(() => {
    // 🚀 수정됨: Render 클라우드 서버 주소로 변경
    axios.get('https://yoneodoo-api.onrender.com/api/v1/recipes')
      .then(response => {
        const realRecipes = response.data
          .filter(recipe => recipe.status === 'SUCCESS' && recipe.ingredients && recipe.ingredients.length > 0)
          .map(recipe => ({
            id: recipe.id,
            title: recipe.title,
            youtuberName: recipe.youtuberName,
            videoId: recipe.videoId,
            mainIngredients: recipe.ingredients, 
            subIngredients: [] 
          }))
        setRecipes(realRecipes)
      })
      .catch(error => console.error("레시피 로드 실패:", error))
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }
    // 🚀 수정됨: Render 클라우드 서버 주소로 변경
    axios.get(`https://yoneodoo-api.onrender.com/api/v1/ingredients/search?keyword=${searchTerm}`)
      .then(response => {
        const filtered = response.data.filter(item => !searchTags.includes(item.name))
        setSuggestions(filtered)
        setSelectedIndex(-1)
      })
  }, [searchTerm, searchTags])

  useEffect(() => {
    if (fridgeSearchTerm.trim() === '') {
      setFridgeSuggestions([])
      setFridgeSelectedIndex(-1)
      return
    }
    // 🚀 수정됨: Render 클라우드 서버 주소로 변경
    axios.get(`https://yoneodoo-api.onrender.com/api/v1/ingredients/search?keyword=${fridgeSearchTerm}`)
      .then(response => {
        const filtered = response.data.filter(item => !myFridge.includes(item.name))
        setFridgeSuggestions(filtered)
        setFridgeSelectedIndex(-1)
      })
  }, [fridgeSearchTerm, myFridge])

  const toggleSearchTag = (ingredientName) => {
    if (searchTags.includes(ingredientName)) {
      setSearchTags(searchTags.filter(tag => tag !== ingredientName))
    } else {
      setSearchTags([...searchTags, ingredientName])
    }
    setSearchTerm('')
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const toggleFridgeItem = (ingredientName) => {
    if (myFridge.includes(ingredientName)) {
      setMyFridge(myFridge.filter(item => item !== ingredientName))
    } else {
      setMyFridge([...myFridge, ingredientName])
    }
    setFridgeSearchTerm('')
    setFridgeSuggestions([])
    setFridgeSelectedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return;
    if (e.nativeEvent.isComposing) return; 

    if (e.key === 'ArrowDown') {
      e.preventDefault(); 
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        toggleSearchTag(suggestions[selectedIndex].name);
      } else {
        toggleSearchTag(suggestions[0].name);
      }
    }
  }

  const handleFridgeKeyDown = (e) => {
    if (fridgeSuggestions.length === 0) return;
    if (e.nativeEvent.isComposing) return; 

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFridgeSelectedIndex(prev => (prev < fridgeSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFridgeSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (fridgeSelectedIndex >= 0) {
        toggleFridgeItem(fridgeSuggestions[fridgeSelectedIndex].name);
      } else {
        toggleFridgeItem(fridgeSuggestions[0].name);
      }
    }
  }

  const openFinishedModal = (recipe) => {
    setFinishedRecipe(recipe)
    setSelectedToEmpty([]) 
  }

  const toggleEmptyItem = (ingName) => {
    if (selectedToEmpty.includes(ingName)) {
      setSelectedToEmpty(selectedToEmpty.filter(i => i !== ingName))
    } else {
      setSelectedToEmpty([...selectedToEmpty, ingName])
    }
  }

  const confirmEmptyFridge = () => {
    if (selectedToEmpty.length > 0) {
      const newFridge = myFridge.filter(item => !selectedToEmpty.includes(item))
      setMyFridge(newFridge)
    }
    setFinishedRecipe(null)
    setSelectedToEmpty([])
  }

  useEffect(() => {
    if (selectedVideo || ingredientsModalRecipe || isFridgeOpen || finishedRecipe) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
  }, [selectedVideo, ingredientsModalRecipe, isFridgeOpen, finishedRecipe])

  const getSortedIngredients = (ingredientsList, compareArray) => {
    return [...ingredientsList].sort((a, b) => {
      const isASelected = compareArray.includes(a.name);
      const isBSelected = compareArray.includes(b.name);
      if (isASelected && !isBSelected) return -1;
      if (!isASelected && isBSelected) return 1;
      return 0; 
    })
  }

  const recommendedRecipes = myFridge.length > 0 
    ? [...recipes].map(recipe => {
        const allIngredientNames = [...recipe.mainIngredients, ...recipe.subIngredients].map(ing => ing.name);
        const matchCount = myFridge.filter(item => allIngredientNames.includes(item)).length;
        const isPerfectMatch = matchCount === allIngredientNames.length && allIngredientNames.length > 0;
        return { ...recipe, matchCount, isPerfectMatch, totalCount: allIngredientNames.length };
      })
      .filter(recipe => recipe.matchCount > 0)
      .sort((a, b) => {
        if (a.isPerfectMatch && !b.isPerfectMatch) return -1;
        if (!a.isPerfectMatch && b.isPerfectMatch) return 1;
        return b.matchCount - a.matchCount;
      })
      .slice(0, 5)
    : [];

  const filteredAllRecipes = searchTags.length > 0
    ? recipes.filter(recipe => {
        const allIngredientNames = [...recipe.mainIngredients, ...recipe.subIngredients].map(ing => ing.name);
        return searchTags.every(tag => allIngredientNames.includes(tag));
      })
    : recipes;

  const renderRecipeCard = (recipe, isRecommended) => {
    const DISPLAY_LIMIT = 5; 
    const highlightArray = isRecommended ? myFridge : searchTags;
    const sortedMain = getSortedIngredients(recipe.mainIngredients, highlightArray);
    const sortedSub = getSortedIngredients(recipe.subIngredients, highlightArray);

    const displayMain = sortedMain.slice(0, DISPLAY_LIMIT);
    const displaySub = sortedSub.slice(0, DISPLAY_LIMIT);
    const needsExpandButton = sortedMain.length > DISPLAY_LIMIT || sortedSub.length > DISPLAY_LIMIT;

    const cardColor = recipe.isPerfectMatch && isRecommended ? '#10b981' : '#3b82f6';

    return (
      <div key={recipe.id} style={{ 
        backgroundColor: '#1e1e1e', padding: '18px', borderRadius: '16px', 
        boxShadow: isRecommended ? `0 0 15px ${recipe.isPerfectMatch ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}` : '0 4px 10px rgba(0,0,0,0.5)', 
        border: isRecommended ? `2px solid ${cardColor}` : '1px solid #333', 
        display: 'flex', flexDirection: 'column', position: 'relative'
      }}>
        {isRecommended && (
          <div style={{
            position: 'absolute', top: '-14px', right: '15px', backgroundColor: cardColor,
            color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10
          }}>
            {recipe.isPerfectMatch ? '🍳 당장 요리 가능!' : `🔥 ${recipe.matchCount}개 일치`}
          </div>
        )}

        <div onClick={() => setSelectedVideo(recipe.videoId)} style={{ width: '100%', height: '160px', marginBottom: '15px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000', cursor: 'pointer', position: 'relative' }}>
          <img src={`https://img.youtube.com/vi/${recipe.videoId}/maxresdefault.jpg`} onError={(e) => { e.target.src = `https://img.youtube.com/vi/${recipe.videoId}/hqdefault.jpg`; }} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          
          <div style={{ 
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
            width: '60px', height: '40px', backgroundColor: '#ff0000', borderRadius: '12px', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' 
          }}>
            <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid white', marginLeft: '5px' }}></div>
          </div>
        </div>

        {recipe.youtuberName && (
          <div style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 'bold', marginBottom: '4px' }}>
            📺 {recipe.youtuberName}
          </div>
        )}
        
        <h3 style={{ margin: '0 0 15px 0', color: '#ffffff', fontSize: '1.2rem', lineHeight: '1.3', wordBreak: 'keep-all' }}>{recipe.title}</h3>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>🥩 필요한 재료</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {displayMain.map((ing, idx) => {
              const isHighlighted = highlightArray.includes(ing.name);

              return (
                <span 
                  key={`main-${idx}`} 
                  onClick={() => isRecommended ? toggleFridgeItem(ing.name) : toggleSearchTag(ing.name)}
                  style={{ 
                    backgroundColor: isHighlighted ? cardColor : '#2d2d2d', color: isHighlighted ? 'white' : '#e0e0e0', 
                    padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                    border: `1px solid ${isHighlighted ? cardColor : '#444'}`
                  }}
                >
                  {ing.name} 
                  {showAmount && ing.amount && <span style={{ color: isHighlighted ? '#e0f2fe' : '#888', marginLeft: '4px', fontSize: '0.75rem' }}>({ing.amount})</span>}
                </span>
              )
            })}
          </div>
        </div>

        <div style={{ flexGrow: 1 }}></div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px', width: '100%' }}>
          {needsExpandButton && (
            <button onClick={() => setIngredientsModalRecipe(recipe)} style={{ flex: 1, padding: '10px 0', backgroundColor: '#2d2d2d', border: 'none', color: '#ddd', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
              재료 더보기 +
            </button>
          )}
          <button 
            onClick={() => openFinishedModal(recipe)} 
            style={{ 
              flex: needsExpandButton ? 1 : '1 1 100%', padding: '10px 0', backgroundColor: '#10b981', 
              border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
            }}>
            🍳 요리 완료!
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '30px 20px', fontFamily: 'sans-serif', backgroundColor: '#121212', minHeight: '100vh', color: '#e0e0e0', paddingBottom: '100px' }}>
      
      <button onClick={() => setIsFridgeOpen(true)} style={{ position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '50px', padding: '15px 25px', fontSize: '1.1rem', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.5)', cursor: 'pointer', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.4rem' }}>🧊</span> 내 냉장고 ({myFridge.length})
      </button>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>요리? 너도 할 수 있어!</div>
        <h1 style={{ color: '#ffffff', fontWeight: '900', fontSize: '2.8rem', margin: 0 }}>👨‍🍳 요너두</h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', position: 'relative' }}>
        <input 
          type="text" 
          placeholder="오늘 꼭 써야 할 재료 (검색 후 엔터!)" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown} 
          style={{ width: '100%', padding: '15px 20px', borderRadius: '12px', border: '2px solid #3b82f6', backgroundColor: '#1e1e1e', color: '#ffffff', fontSize: '1.05rem', outline: 'none', boxSizing: 'border-box' }}
        />

        {suggestions.length > 0 && (
          <ul style={{ position: 'absolute', top: '60px', left: 0, right: 0, backgroundColor: '#1e1e1e', borderRadius: '12px', listStyle: 'none', padding: '8px 0', margin: 0, boxShadow: '0 8px 16px rgba(0,0,0,0.8)', zIndex: 100, border: '1px solid #333' }}>
            {suggestions.map((item, index) => (
              <li 
                key={item.id} 
                onClick={() => toggleSearchTag(item.name)}
                style={{ 
                  padding: '10px 20px', cursor: 'pointer', fontSize: '0.95rem', color: '#ffffff',
                  backgroundColor: index === selectedIndex ? '#2d2d2d' : 'transparent' 
                }}
              >
                🔍 {item.name}
              </li>
            ))}
          </ul>
        )}

        {searchTags.length > 0 && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px dashed #444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#aaa', fontWeight: 'bold' }}>🎯 현재 적용된 필수 필터</span>
              <button onClick={() => setSearchTags([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ 필터 초기화</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {searchTags.map(tag => (
                <div key={tag} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                  {tag} <span onClick={() => toggleSearchTag(tag)} style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold' }}>×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {myFridge.length > 0 && searchTags.length === 0 && (
        <div style={{ marginBottom: '50px' }}>
          <h2 style={{ color: '#10b981', fontSize: '1.5rem', marginBottom: '25px', fontWeight: 'bold' }}>🧊 내 냉장고 파먹기 추천 (Top 5)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {recommendedRecipes.map(recipe => renderRecipeCard(recipe, true))}
          </div>
          <hr style={{ border: '0', height: '1px', backgroundColor: '#333', marginTop: '40px' }} />
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '1.3rem', margin: 0 }}>{searchTags.length > 0 ? `🎯 필터링된 레시피 (${filteredAllRecipes.length}개)` : `전체 레시피 탐색 (${recipes.length}개)`}</h2>
          <button onClick={() => setShowAmount(!showAmount)} style={{ backgroundColor: showAmount ? '#2d2d2d' : '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold' }}>{showAmount ? "⚖️ 용량 숨기기" : "⚖️ 용량 보기"}</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {filteredAllRecipes.map(recipe => renderRecipeCard(recipe, false))}
        </div>
      </div>

      {isFridgeOpen && (
        <div onClick={() => setIsFridgeOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '500px', border: '1px solid #444', position: 'relative', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <button onClick={() => setIsFridgeOpen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#888', fontSize: '1.8rem', cursor: 'pointer' }}>×</button>
            <h2 style={{ color: '#10b981', margin: '0 0 20px 0', fontSize: '1.5rem' }}>🧊 내 냉장고 관리</h2>
            
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="재료 검색 (검색 후 엔터!)" 
                value={fridgeSearchTerm} 
                onChange={(e) => setFridgeSearchTerm(e.target.value)}
                onKeyDown={handleFridgeKeyDown} 
                style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #444', backgroundColor: '#121212', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }} 
              />
              {fridgeSuggestions.length > 0 && (
                <ul style={{ position: 'absolute', top: '50px', left: 0, right: 0, backgroundColor: '#2d2d2d', borderRadius: '8px', listStyle: 'none', padding: '8px 0', margin: 0, zIndex: 100 }}>
                  {fridgeSuggestions.map((item, index) => (
                    <li 
                      key={item.id} 
                      onClick={() => toggleFridgeItem(item.name)} 
                      style={{ 
                        padding: '10px 15px', cursor: 'pointer', fontSize: '0.95rem', color: '#ffffff',
                        backgroundColor: index === fridgeSelectedIndex ? '#444' : 'transparent'
                      }}
                    >
                      ➕ {item.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ overflowY: 'auto', flexGrow: 1, padding: '15px', backgroundColor: '#121212', borderRadius: '12px', border: '1px inset #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ color: '#aaa', fontSize: '0.9rem', fontWeight: 'bold' }}>현재 보관 중인 재료 ({myFridge.length}개)</span>
                {myFridge.length > 0 && (
                  <button onClick={() => setMyFridge([])} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>싹 비우기</button>
                )}
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {myFridge.length === 0 ? (
                  <div style={{ width: '100%', textAlign: 'center', color: '#666', padding: '20px 0', fontSize: '0.9rem' }}>
                    냉장고가 텅 비어있습니다. 재료를 채워주세요!
                  </div>
                ) : (
                  myFridge.map(item => (
                    <div key={item} style={{ backgroundColor: '#10b981', color: 'white', padding: '8px 14px', borderRadius: '8px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                      {item} <span onClick={() => toggleFridgeItem(item)} style={{ marginLeft: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>×</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {selectedVideo && (
        <div onClick={() => setSelectedVideo(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '90%', maxWidth: '400px', aspectRatio: '9/16' }}>
            <button onClick={() => setSelectedVideo(null)} style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`} frameBorder="0" allowFullScreen style={{ borderRadius: '16px' }}></iframe>
          </div>
        </div>
      )}

      {ingredientsModalRecipe && (
        <div onClick={() => setIngredientsModalRecipe(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(3px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '1px solid #444', position: 'relative' }}>
            <button onClick={() => setIngredientsModalRecipe(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#888', fontSize: '1.8rem', cursor: 'pointer' }}>×</button>
            <h2 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '1.3rem', wordBreak: 'keep-all' }}>{ingredientsModalRecipe.title} 재료</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[...ingredientsModalRecipe.mainIngredients, ...(ingredientsModalRecipe.subIngredients || [])].map((ing, idx) => {
                const isHighlighted = searchTags.includes(ing.name);

                return (
                  <span 
                    key={`modal-ing-${idx}`} 
                    onClick={() => toggleSearchTag(ing.name)}
                    style={{ 
                      backgroundColor: isHighlighted ? '#3b82f6' : '#2d2d2d', color: isHighlighted ? 'white' : '#e0e0e0', 
                      padding: '6px 14px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: isHighlighted ? 'bold' : 'normal',
                      border: `1px solid ${isHighlighted ? '#3b82f6' : '#444'}`, cursor: 'pointer'
                    }}
                  >
                    {ing.name} {showAmount && ing.amount && <span style={{ color: isHighlighted ? '#e0f2fe' : '#888', marginLeft: '4px', fontSize: '0.85rem' }}>({ing.amount})</span>}
                  </span>
                )
              })}
            </div>
            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>재료를 클릭하면 검색 필터에 추가됩니다!</p>
          </div>
        </div>
      )}

      {finishedRecipe && (
        <div onClick={() => setFinishedRecipe(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '400px', border: '1px solid #444', position: 'relative', textAlign: 'center' }}>
            <h2 style={{ color: '#10b981', margin: '0 0 10px 0', fontSize: '1.6rem' }}>🎉 요리 완료!</h2>
            <p style={{ color: '#ccc', fontSize: '0.95rem', marginBottom: '25px', lineHeight: '1.5' }}>
              맛있게 드셨나요?<br/>냉장고에서 <b>완전히 다 써버린 재료</b>가 있다면<br/>선택해서 비워주세요!
            </p>

            {(() => {
              const recipeIngNames = [...finishedRecipe.mainIngredients, ...(finishedRecipe.subIngredients || [])].map(ing => ing.name)
              const fridgeOverlap = myFridge.filter(item => recipeIngNames.includes(item))

              if (fridgeOverlap.length > 0) {
                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#121212', padding: '15px', borderRadius: '12px', border: '1px inset #333', maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', textAlign: 'left' }}>
                      {fridgeOverlap.map(ing => (
                        <label key={ing} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff', fontSize: '1rem', cursor: 'pointer', padding: '5px 0' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedToEmpty.includes(ing)}
                            onChange={() => toggleEmptyItem(ing)}
                            style={{ width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                          />
                          {ing}
                        </label>
                      ))}
                    </div>
                    
                    <button 
                      onClick={confirmEmptyFridge}
                      style={{ width: '100%', padding: '12px', backgroundColor: selectedToEmpty.length > 0 ? '#10b981' : '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'background-color 0.3s' }}
                    >
                      {selectedToEmpty.length > 0 ? `선택한 ${selectedToEmpty.length}개 재료 비우기` : '다 쓴 재료 없어요 (닫기)'}
                    </button>
                  </>
                )
              } else {
                return (
                  <>
                    <div style={{ padding: '20px', backgroundColor: '#121212', borderRadius: '12px', color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
                      이 레시피에 쓰인 재료 중<br/>현재 냉장고에 등록된 재료가 없습니다.
                    </div>
                    <button 
                      onClick={() => setFinishedRecipe(null)}
                      style={{ width: '100%', padding: '12px', backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                    >
                      확인 (닫기)
                    </button>
                  </>
                )
              }
            })()}
          </div>
        </div>
      )}

    </div>
  )
}

export default App