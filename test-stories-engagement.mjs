import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testStoriesEngagement() {
  console.log('\n📖 Testing Stories Comments and Likes...\n')
  console.log('='.repeat(80))
  
  // Fetch all stories
  const { data: stories, error: storiesError } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (storiesError) {
    console.error('❌ Error fetching stories:', storiesError.message)
    return
  }
  
  if (!stories || stories.length === 0) {
    console.log('\n⚠️  No stories found in database\n')
    return
  }
  
  console.log(`\n✅ Found ${stories.length} stories\n`)
  
  let totalComments = 0
  let totalLikes = 0
  const storiesWithEngagement = []
  
  // Check each story for comments and likes
  for (const story of stories) {
    console.log(`\n📖 Story: "${story.title}"`)
    console.log(`   ID: ${story.id}`)
    console.log(`   Author ID: ${story.author_id}`)
    console.log(`   Created: ${new Date(story.created_at).toLocaleDateString()}`)
    console.log(`   Status: ${story.status}`)
    
    // Fetch author profile
    const { data: author } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', story.author_id)
      .single()
    
    if (author) {
      console.log(`   Author: ${author.full_name || 'Unknown'} (${author.email || 'No email'})`)
    }
    
    // Fetch comments for this story
    const { data: comments, error: commentsError } = await supabase
      .from('story_comments')
      .select('*')
      .eq('story_id', story.id)
      .order('created_at', { ascending: false })
    
    if (commentsError) {
      console.log(`   ❌ Error fetching comments: ${commentsError.message}`)
    } else {
      const commentCount = comments?.length || 0
      totalComments += commentCount
      console.log(`   💬 Comments: ${commentCount}`)
      
      if (comments && comments.length > 0) {
        console.log(`   └─ Recent comments:`)
        for (const comment of comments.slice(0, 3)) {
          // Fetch commenter profile
          const { data: commenter } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', comment.user_id)
            .single()
          
          const commenterName = commenter?.full_name || 'Anonymous'
          const commentContent = comment.comment_text || ''
          const commentPreview = commentContent.substring(0, 50) + (commentContent.length > 50 ? '...' : '')
          console.log(`      • ${commenterName}: "${commentPreview}"`)
          console.log(`        ${new Date(comment.created_at).toLocaleString()}`)
        }
      }
    }
    
    // Fetch likes for this story
    const { data: likes, error: likesError } = await supabase
      .from('story_likes')
      .select('*')
      .eq('story_id', story.id)
    
    if (likesError) {
      console.log(`   ❌ Error fetching likes: ${likesError.message}`)
    } else {
      const likeCount = likes?.length || 0
      totalLikes += likeCount
      console.log(`   ❤️  Likes: ${likeCount}`)
      
      if (likes && likes.length > 0) {
        console.log(`   └─ Recent likes from:`)
        for (const like of likes.slice(0, 5)) {
          // Fetch liker profile
          const { data: liker } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', like.user_id)
            .single()
          
          const likerName = liker?.full_name || 'Anonymous'
          console.log(`      • ${likerName} (${new Date(like.created_at).toLocaleString()})`)
        }
      }
    }
    
    // Track stories with engagement
    if ((comments?.length || 0) > 0 || (likes?.length || 0) > 0) {
      storiesWithEngagement.push({
        title: story.title,
        comments: comments?.length || 0,
        likes: likes?.length || 0
      })
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('\n📊 ENGAGEMENT SUMMARY\n')
  console.log(`Total Stories: ${stories.length}`)
  console.log(`Stories with Engagement: ${storiesWithEngagement.length}`)
  console.log(`Total Comments: ${totalComments}`)
  console.log(`Total Likes: ${totalLikes}`)
  console.log(`Average Comments per Story: ${(totalComments / stories.length).toFixed(1)}`)
  console.log(`Average Likes per Story: ${(totalLikes / stories.length).toFixed(1)}`)
  
  if (storiesWithEngagement.length > 0) {
    console.log('\n🔥 Top Engaged Stories:')
    storiesWithEngagement
      .sort((a, b) => (b.comments + b.likes) - (a.comments + a.likes))
      .slice(0, 5)
      .forEach((story, index) => {
        console.log(`   ${index + 1}. "${story.title}"`)
        console.log(`      💬 ${story.comments} comments | ❤️  ${story.likes} likes`)
      })
  }
  
  console.log('\n' + '='.repeat(80))
  console.log('\n✅ Stories engagement test complete!\n')
}

testStoriesEngagement()
