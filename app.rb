require 'bundler/setup'
Bundler.require
require 'sinatra/reloader' if development?
require 'sinatra-websocket'
require 'sinatra/activerecord'
require './models'
require 'pry' if development?
require 'json'

set :server, 'thin'
set :sockets, []
set :current_user, nil

# プレイ開始&コマ位置取得
post '/start' do
    # 消しゴム作成
    eraser = Eraser.create(
        x: params[:x],
        y: params[:y]
    )

    # 新しい消しゴムが召喚された時
    content_type :json
    to_ws = {
        event: "new",
        id: eraser.id.to_i,
        x: params[:x].to_f,
        y: params[:y].to_f,
    }
    
    settings.sockets.each do |s|
        s[:ws].send(to_ws.to_json)
    end
    
    # RESPONSE
    data = {
        id: eraser[:id],
        erasers: Eraser.all
    }

    data.to_json

    # redirect '/start'
end

# 角度・強さ送信
post '/eraser/snap' do

    # 生存確認
    my_eraser = Eraser.find(params[:id])

    # 誰かが弾いた時にばら撒かれるデータ(全体ブロードキャスト)
    content_type :json
    to_ws = {
        id: params[:id].to_i,
        event: "snap",
        x: params[:x].to_f,
        y: params[:y].to_f
    }
    
    settings.sockets.each do |s|
        s[:ws].send(to_ws.to_json)
    end
    
    # RESPONSE
    if(my_eraser)
        data = {
            ok: "ture",
            data: to_ws
        }
    else
        data = {
            ok: "false"
        }
    end

    data.to_json
end

# 弾き予約
post '/snap/reserve' do

    reserve = ReserveNum.create(
        player_id: params[:id].to_i
    )

    puts "Reserve: #{params[:id]}, #{settings.current_user}"
    # 次のターン通知
    if(settings.current_user == nil)
        reserve_func
    end

    # RESPONSE
    if(reserve)
        data = {
            ok: "ture"
        }
    else
        data = {
            ok: "false"
        }
    end

    data.to_json

end

# コマ削除
# post '/erasar/remove' do
    
#     # 負けたコマを取得
#     eraser = Eraser.find(params[:id])

#     # 予約がクローズされたコマである間
#     if ReserveNum.first != nil && ReserveNum.first.player_id == params[:id]

#         ReserveNum.first.delete

#         reserve_func

#     end

#     dl_reserves = ReserveNum.where(player_id: params[:id])
    
#     dl_reserves.each do |dl|
#         dl.delete
#     end

#     to_ws = {
#         id: params[:id].to_i
#     }
#     settings.sockets.each do |s|
#         s[:ws].send(to_ws.to_json)
#     end

#     if erasar.delete
#         data = {
#             ok: "ture"
#         }
#     else
#         data = {
#             ok: "false"
#         }
#     end

#     data.to_json

# end

# コマ位置通知=ターン終了
post '/eraser/position' do

    # 終了したコマの取得
    # reserve = ReserveNum.where(player_id: params[:id])
    eraser = Eraser.find(params[:id])

    # 位置の更新
    eraser.update(
        x: params[:x].to_f,
        y: params[:y].to_f
    )

    eraser.save
    
    # 次のターン通知
    reserve_func

    # RESPONSE
    if(eraser)
        data = {
            ok: "OK"
        }
    else
        data = {
            ok: "NG"
        }
    end

    data.to_json

end

get '/websocket/:id' do
  id = params[:id]
  if request.websocket?
    request.websocket do |ws|
      ws.onopen do
        # settings.sockets << ws
        settings.sockets << { id: id, ws: ws }
      end
    #   ws.onmessage do |msg|
    #     settings.sockets.each do |s|
    #         s.send(msg)
    #     end
    #   end
      ws.onclose do
        # settings.sockets.delete(ws)
        settings.sockets.delete({ id: id, ws: ws })

        puts "Connection closed: #{id}"
        puts "Current user: #{settings.current_user}"
        
        # 予約がクローズされたコマである間
        if settings.current_user == id.to_i
            reserve_func
        end

        to_ws = {
            id: id.to_i,
            event: "remove"
        }
        settings.sockets.each do |s|
            s[:ws].send(to_ws.to_json)
        end

        # 予約からクローズれさたコマの予約を消す
        reserve = ReserveNum.where(player_id: id)
        reserve.each do |r|
            r.delete
        end

        eraser = Eraser.find(id)
        if eraser
            eraser.delete
        end

      end
    end
  end
end

# 次のターン通知
def reserve_func
    # ーーーーーーーーーーーーーーーー
    # 次のターンのユーザーに通知する

    # 弾き予約のはじめのユーザーを取得
    next_turn = ReserveNum.first

    if(next_turn)
        settings.sockets.each { |s|
            # 弾き予約のはじめのユーザーのidと一致すれば、そのユーザーに通知する
            if s[:id] == "#{next_turn.player_id}"
                res = {
                    event: "turn",
                    id: "#{next_turn.player_id}"
                }
                s[:ws].send(res.to_json)
            end
        }
        # 通知したユーザーの弾き予約をDBから削除する
        settings.current_user = next_turn.player_id
        next_turn.delete
    else
        settings.current_user = nil
    end

    # ーーーーーーーーーーーーーーーーー
end

options '*' do
    response.headers["Access-Control-Allow-Methods"] = "GET, PUT, POST, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, X-User-Email, X-Auth-Token, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
end
  
before do
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
end