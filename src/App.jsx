import { useState, useEffect } from 'react'
import axios from 'axios'

function App() {
  const [recipes, setRecipes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState([]) 
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [ingredientsModalRecipe, setIngredientsModalRecipe] = useState(null)
  
  // 🚀 핵심 1. 용량 보기/숨기기 토글 상태 (기본값: 안 보임)
  const [showAmount, setShowAmount] = useState(false)

  // 🚀 핵심 2. 내 냉장고 상태 (로컬 스토리지 연동)
  const [selectedTags, setSelectedTags] = useState(() => {
    const saved = localStorage.getItem('yoneodoo_fridge')
    return saved ? JSON.parse(saved) : []
  })

  // 내 냉장고(selectedTags)가 변경될 때마다 브라우저 저장소에 동기화합니다.
  useEffect(() => {
    localStorage.setItem('yoneodoo_fridge', JSON.stringify(selectedTags))
  }, [selectedTags])

  useEffect(() => {
    axios.get('http://localhost:8080/api/v1/recipes')
      .then(response => {
        const realRecipes = response.data
          .filter(recipe => recipe.status === 'SUCCESS' && recipe.ingredients && recipe.ingredients.length > 0)
          .map(recipe => {
            return {
              id: recipe.id,
              title: recipe.title,
              videoId: recipe.videoId,
              // 🚀 핵심 3. 이름만 뽑지 않고, name과 amount가 모두 있는 객체 배열을 그대로 저장!
              mainIngredients: recipe.ingredients, 
              subIngredients: [] 
            }
          })
        setRecipes(realRecipes)
      })
      .catch(error => {
        console.error("실제 레시피 데이터를 가져오는데 실패했습니다:", error)
      })
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([])
      return
    }

    axios.get(`http://localhost:8080/api/v1/ingredients/search?keyword=${searchTerm}`)
      .then(response => {
        const filtered = response.data.filter(item => !selectedTags.includes(item.name))
        setSuggestions(filtered)
      })
      .catch(error => {
        console.error("초성 검색 API 에러:", error)
      })
  }, [searchTerm, selectedTags])

  const toggleTag = (ingredientName) => {
    if (selectedTags.includes(ingredientName)) {
      setSelectedTags(selectedTags.filter(tag => tag !== ingredientName))
    } else {
      setSelectedTags([...selectedTags, ingredientName])
    }
    setSearchTerm('')
    setSuggestions([])
  }

  const removeTag = (tagToRemove) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove))
  }

  const filteredRecipes = recipes.filter(recipe => {
    if (selectedTags.length === 0) return true;
    // 이제 mainIngredients가 객체 배열이므로 .map(ing => ing.name)으로 이름만 꺼내서 비교합니다.
    const allIngredientNames = [...recipe.mainIngredients, ...recipe.subIngredients].map(ing => ing.name);
    return selectedTags.every(tag => allIngredientNames.includes(tag))
  })

  useEffect(() => {
    if (selectedVideo || ingredientsModalRecipe) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedVideo, ingredientsModalRecipe])

  // 정렬 로직도 객체(ing)의 name 속성을 기준으로 판단하도록 수정
  const getSortedIngredients = (ingredientsList) => {
    return [...ingredientsList].sort((a, b) => {
      const isASelected = selectedTags.includes(a.name);
      const isBSelected = selectedTags.includes(b.name);
      if (isASelected && !isBSelected) return -1;
      if (!isASelected && isBSelected) return 1;
      return 0; 
    })
  }

  return (
    <div style={{ padding: '30px 20px', fontFamily: 'sans-serif', backgroundColor: '#121212', minHeight: '100vh', color: '#e0e0e0' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          요리? 너도 할 수 있어!
        </div>
        <h1 style={{ color: '#ffffff', fontWeight: '900', fontSize: '2.8rem', margin: 0, letterSpacing: '-1.5px' }}>
          👨‍🍳 요너두
        </h1>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', position: 'relative' }}>
        <input 
          type="text" 
          placeholder="가지고 있는 재료를 입력하세요 (예: ㄱ, ㄱㅈ, 닭)" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', padding: '15px 20px', borderRadius: '12px', 
            border: '1px solid #333', backgroundColor: '#1e1e1e', color: '#ffffff',
            fontSize: '1.05rem', outline: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', boxSizing: 'border-box'
          }}
        />

        {suggestions.length > 0 && (
          <ul style={{
            position: 'absolute', top: '60px', left: 0, right: 0, 
            backgroundColor: '#1e1e1e', borderRadius: '12px',
            listStyle: 'none', padding: '8px 0', margin: 0, 
            boxShadow: '0 8px 16px rgba(0,0,0,0.8)', zIndex: 100, border: '1px solid #333'
          }}>
            {suggestions.map(item => (
              <li 
                key={item.id} 
                onClick={() => toggleTag(item.name)}
                style={{ padding: '10px 20px', cursor: 'pointer', fontSize: '0.95rem', color: '#ffffff' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2d2d2d'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#1e1e1e'}
              >
                🔍 {item.name}
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
          {selectedTags.map(tag => (
            <div key={tag} style={{ 
              backgroundColor: '#3b82f6', color: 'white', padding: '6px 12px', 
              borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center'
            }}>
              {tag}
              <span onClick={() => removeTag(tag)} style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold' }}>×</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 🚀 글로벌 용량 토글 버튼 & 결과 카운트 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>
          추천 레시피 ({filteredRecipes.length}개)
        </h2>
        <button 
          onClick={() => setShowAmount(!showAmount)}
          style={{
            backgroundColor: showAmount ? '#2d2d2d' : '#3b82f6',
            color: 'white', border: 'none', padding: '8px 16px', 
            borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer',
            fontWeight: 'bold', transition: '0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          {showAmount ? "⚖️ 용량 숨기기" : "⚖️ 용량 보기"}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
        {filteredRecipes.map(recipe => {
          
          const DISPLAY_LIMIT = 5; 
          const sortedMain = getSortedIngredients(recipe.mainIngredients);
          const sortedSub = getSortedIngredients(recipe.subIngredients);

          const displayMain = sortedMain.slice(0, DISPLAY_LIMIT);
          const displaySub = sortedSub.slice(0, DISPLAY_LIMIT);
          const needsExpandButton = sortedMain.length > DISPLAY_LIMIT || sortedSub.length > DISPLAY_LIMIT;

          return (
            <div key={recipe.id} style={{ backgroundColor: '#1e1e1e', padding: '18px', borderRadius: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
              
              <div 
                onClick={() => setSelectedVideo(recipe.videoId)}
                style={{ 
                  width: '100%', height: '160px', marginBottom: '15px', borderRadius: '10px', 
                  overflow: 'hidden', backgroundColor: '#000', cursor: 'pointer', position: 'relative' 
                }}
              >
                <img 
                  src={`https://img.youtube.com/vi/${recipe.videoId}/maxresdefault.jpg`} 
                  onError={(e) => { e.target.src = `https://img.youtube.com/vi/${recipe.videoId}/hqdefault.jpg`; }} 
                  alt="thumbnail" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.8 }} 
                />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2.5rem', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                  ▶️
                </div>
              </div>

              <h3 style={{ margin: '0 0 15px 0', color: '#ffffff', fontSize: '1.2rem', lineHeight: '1.3', wordBreak: 'keep-all' }}>{recipe.title}</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>🥩 주재료</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {displayMain.map((ing, idx) => (
                    <span 
                      key={`main-${idx}`} 
                      onClick={() => toggleTag(ing.name)}
                      style={{ 
                        backgroundColor: selectedTags.includes(ing.name) ? '#3b82f6' : '#2d2d2d', 
                        color: selectedTags.includes(ing.name) ? 'white' : '#e0e0e0', 
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', 
                        fontWeight: selectedTags.includes(ing.name) ? 'bold' : 'normal',
                        cursor: 'pointer' 
                      }}
                    >
                      {/* 🚀 showAmount 상태에 따라 용량을 렌더링합니다 */}
                      {ing.name} 
                      {showAmount && ing.amount && (
                        <span style={{ color: selectedTags.includes(ing.name) ? '#cbf4ff' : '#888', marginLeft: '4px', fontSize: '0.75rem' }}>
                          ({ing.amount})
                        </span>
                      )}
                    </span>
                  ))}
                  {sortedMain.length > DISPLAY_LIMIT && (
                    <span style={{ color: '#888', fontSize: '0.8rem', alignSelf: 'center', marginLeft: '2px' }}>...</span>
                  )}
                </div>
              </div>

              {recipe.subIngredients && recipe.subIngredients.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '6px', fontWeight: 'bold' }}>🧂 부재료 (양념/소스)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {displaySub.map((ing, idx) => (
                      <span 
                        key={`sub-${idx}`} 
                        onClick={() => toggleTag(ing.name)}
                        style={{ 
                          backgroundColor: selectedTags.includes(ing.name) ? '#10b981' : '#2d2d2d', 
                          color: selectedTags.includes(ing.name) ? 'white' : '#888', 
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        {ing.name}
                        {showAmount && ing.amount && (
                          <span style={{ color: selectedTags.includes(ing.name) ? '#cbf4ff' : '#555', marginLeft: '4px', fontSize: '0.75rem' }}>
                            ({ing.amount})
                          </span>
                        )}
                      </span>
                    ))}
                    {sortedSub.length > DISPLAY_LIMIT && (
                      <span style={{ color: '#888', fontSize: '0.8rem', alignSelf: 'center', marginLeft: '2px' }}>...</span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ flexGrow: 1 }}></div>
              
              {needsExpandButton && (
                <button 
                  onClick={() => setIngredientsModalRecipe(recipe)}
                  style={{
                    width: '100%', marginTop: '15px', padding: '8px', 
                    backgroundColor: '#2d2d2d', border: 'none', 
                    color: '#ddd', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 'bold', transition: '0.2s'
                  }}
                  onMouseOver={(e) => { e.target.style.backgroundColor = '#444'; e.target.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.target.style.backgroundColor = '#2d2d2d'; e.target.style.color = '#ddd'; }}
                >
                  모든 재료 보기 +
                </button>
              )}

            </div>
          )
        })}
      </div>

      {selectedVideo && (
        <div 
          onClick={() => setSelectedVideo(null)} 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 9999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(5px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ position: 'relative', width: '90%', maxWidth: '400px', aspectRatio: '9/16' }}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: 'none', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ×
            </button>
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`} 
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
            ></iframe>
          </div>
        </div>
      )}

      {ingredientsModalRecipe && (
        <div 
          onClick={() => setIngredientsModalRecipe(null)} 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 9999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '20px', 
              width: '90%', maxWidth: '400px', border: '1px solid #444', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)', position: 'relative'
            }}
          >
            <button 
              onClick={() => setIngredientsModalRecipe(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#888', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
            
            <h2 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '1.3rem', paddingRight: '30px', wordBreak: 'keep-all' }}>
              {ingredientsModalRecipe.title} 재료
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', fontWeight: 'bold' }}>🥩 주재료</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {getSortedIngredients(ingredientsModalRecipe.mainIngredients).map((ing, idx) => (
                  <span 
                    key={`modal-main-${idx}`} 
                    onClick={() => toggleTag(ing.name)}
                    style={{ 
                      backgroundColor: selectedTags.includes(ing.name) ? '#3b82f6' : '#2d2d2d', 
                      color: selectedTags.includes(ing.name) ? 'white' : '#e0e0e0', 
                      padding: '6px 14px', borderRadius: '8px', fontSize: '0.95rem', 
                      fontWeight: selectedTags.includes(ing.name) ? 'bold' : 'normal', cursor: 'pointer' 
                    }}
                  >
                    {ing.name}
                    {showAmount && ing.amount && (
                      <span style={{ color: selectedTags.includes(ing.name) ? '#cbf4ff' : '#888', marginLeft: '4px', fontSize: '0.85rem' }}>
                        ({ing.amount})
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {ingredientsModalRecipe.subIngredients && ingredientsModalRecipe.subIngredients.length > 0 && (
              <div>
                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', fontWeight: 'bold' }}>🧂 부재료 (양념/소스)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getSortedIngredients(ingredientsModalRecipe.subIngredients).map((ing, idx) => (
                    <span 
                      key={`modal-sub-${idx}`} 
                      onClick={() => toggleTag(ing.name)}
                      style={{ 
                        backgroundColor: selectedTags.includes(ing.name) ? '#10b981' : '#2d2d2d', 
                        color: selectedTags.includes(ing.name) ? 'white' : '#888', 
                        padding: '6px 14px', borderRadius: '8px', fontSize: '0.95rem', cursor: 'pointer'
                      }}
                    >
                      {ing.name}
                      {showAmount && ing.amount && (
                        <span style={{ color: selectedTags.includes(ing.name) ? '#cbf4ff' : '#555', marginLeft: '4px', fontSize: '0.85rem' }}>
                          ({ing.amount})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App