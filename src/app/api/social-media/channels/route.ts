import { NextRequest, NextResponse } from 'next/server';

// Mock data for channels - will be replaced with actual database integration
const mockChannels = [
  {
    id: 1,
    name: 'Facebook | NXT Level Tech SA',
    platform: 'facebook',
    handle: '@NXTLevelTechSA',
    followers: '45.2K',
    status: 'Healthy',
    lastSync: new Date('2024-12-07'),
    branch: 'Cape Town',
    isConnected: true,
    authType: 'oauth',
    healthScore: 100,
    pingLatency: 23,
    tokenExpiresIn: 'Valid',
    apiUsage: 12
  },
  {
    id: 2,
    name: 'Instagram | @nxtleveltech_sa',
    platform: 'instagram',
    handle: '@nxtleveltech_sa',
    followers: '32.8K',
    status: 'Healthy',
    lastSync: new Date('2024-12-07'),
    branch: 'Cape Town',
    isConnected: true,
    authType: 'oauth',
    healthScore: 95,
    pingLatency: 31,
    tokenExpiresIn: 'Valid',
    apiUsage: 8
  },
  {
    id: 3,
    name: 'TikTok | @nxtleveltech',
    platform: 'tiktok',
    handle: '@nxtleveltech',
    followers: '28.4K',
    status: 'Healthy',
    lastSync: new Date('2024-12-06'),
    branch: 'Cape Town',
    isConnected: true,
    authType: 'oauth',
    healthScore: 98,
    pingLatency: 18,
    tokenExpiresIn: 'Valid',
    apiUsage: 15
  },
  {
    id: 4,
    name: 'WhatsApp | Business Chat',
    platform: 'whatsapp',
    handle: 'Business Chat',
    followers: '2.1K',
    status: 'Healthy',
    lastSync: new Date('2024-12-07'),
    branch: 'Cape Town',
    isConnected: false,
    authType: 'oauth',
    healthScore: 0,
    pingLatency: 0,
    tokenExpiresIn: 'Expired',
    apiUsage: 0
  }
];

export async function GET(request: NextRequest) {
  try {
    // Mock response for now - replace with actual database query
    return NextResponse.json({ channels: mockChannels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Create new channel with mock data
    const newChannel = {
      id: mockChannels.length + 1,
      name: body.name,
      platform: body.platform,
      handle: body.handle,
      followers: '0',
      status: 'Disconnected',
      lastSync: null,
      branch: 'Cape Town',
      isConnected: false,
      authType: body.authType || 'oauth',
      healthScore: 0,
      pingLatency: 0,
      tokenExpiresIn: 'Expired',
      apiUsage: 0
    };

    // In a real implementation, this would save to database
    mockChannels.push(newChannel);

    return NextResponse.json({ channel: newChannel }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Find and update the channel in mock data
    const channelIndex = mockChannels.findIndex(c => c.id === id);
    if (channelIndex === -1) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    mockChannels[channelIndex] = { ...mockChannels[channelIndex], ...updateData };

    return NextResponse.json({ channel: mockChannels[channelIndex] });
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Remove from mock data
    const channelIndex = mockChannels.findIndex(c => c.id === parseInt(id));
    if (channelIndex !== -1) {
      mockChannels.splice(channelIndex, 1);
    }

    return NextResponse.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}
